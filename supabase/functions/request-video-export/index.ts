// @ts-ignore Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
// @ts-ignore Deno
import JSZip from 'https://esm.sh/jszip@3.10.1'

declare const Deno: any
declare const EdgeRuntime: any

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

function sanitizeName(s: string | null | undefined, fallback: string): string {
  if (!s) return fallback
  return (
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || fallback
  )
}

async function processJob(jobId: string) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  // Marque le job comme en cours
  await admin
    .from('video_export_jobs')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', jobId)

  try {
    // Récupère le job
    const { data: job, error: jobErr } = await admin
      .from('video_export_jobs')
      .select('*')
      .eq('id', jobId)
      .single()
    if (jobErr || !job) throw new Error(jobErr?.message || 'Job introuvable')

    // Récupère la session + projet + questions
    const { data: session, error: sessErr } = await admin
      .from('sessions')
      .select(
        'id, candidate_name, candidate_email, created_at, duration_seconds, projects(id, title, job_title, questions(id, content, order_index))',
      )
      .eq('id', job.session_id)
      .single()
    if (sessErr || !session) throw new Error('Session introuvable')

    // Récupère les segments vidéo
    const { data: messages, error: msgErr } = await admin
      .from('session_messages')
      .select('id, role, video_segment_url, question_id, is_follow_up, timestamp')
      .eq('session_id', job.session_id)
      .order('timestamp', { ascending: true })
    if (msgErr) throw new Error(msgErr.message)

    const segments = (messages || [])
      .filter((m: any) => !!m.video_segment_url && m.role === 'candidate')
      .sort(
        (a: any, b: any) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )

    if (segments.length === 0) {
      throw new Error('Aucun segment vidéo trouvé pour cette session.')
    }

    const projectQuestions = ((session as any).projects?.questions ?? [])
      .slice()
      .sort(
        (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0),
      )
    const orderById = new Map<string, number>()
    projectQuestions.forEach((q: any, i: number) => {
      if (q?.id) orderById.set(q.id, i + 1)
    })

    const zip = new JSZip()
    const followUpCounter = new Map<string, number>()
    const fileEntries: { name: string; question: string }[] = []
    const missing: string[] = []

    for (let i = 0; i < segments.length; i++) {
      const m: any = segments[i]
      const seq = String(i + 1).padStart(2, '0')
      const questionNumber =
        (m.question_id && orderById.get(m.question_id)) || null
      const questionLabel = questionNumber
        ? `question-${questionNumber}`
        : 'question'

      let suffix = ''
      if (m.is_follow_up) {
        const key = m.question_id || `idx-${i}`
        const k = (followUpCounter.get(key) ?? 0) + 1
        followUpCounter.set(key, k)
        suffix = `-relance-${k}`
      }

      const projectQ = m.question_id
        ? projectQuestions.find((q: any) => q.id === m.question_id)
        : null
      const questionText =
        projectQ?.content ||
        (questionNumber ? `Question ${questionNumber}` : 'Question')
      const baseName = `${seq}-${questionLabel}${suffix}`

      try {
        const res = await fetch(m.video_segment_url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const buf = new Uint8Array(await res.arrayBuffer())
        const ext = m.video_segment_url.toLowerCase().includes('.mp4')
          ? 'mp4'
          : 'webm'
        const name = `${baseName}.${ext}`
        zip.file(name, buf)
        fileEntries.push({ name, question: questionText })
      } catch (err) {
        console.warn(`[export] segment ${baseName} failed`, err)
        missing.push(baseName)
      }
    }

    if (fileEntries.length === 0) {
      throw new Error("Aucun segment n'a pu être téléchargé.")
    }

    // README
    const safeName = sanitizeName(session.candidate_name, 'candidat')
    const dateStr = new Date(session.created_at ?? Date.now())
      .toISOString()
      .slice(0, 10)
    const durationMin = session.duration_seconds
      ? Math.round((session.duration_seconds as number) / 60)
      : null

    const readme: string[] = []
    readme.push(`Entretien — ${session.candidate_name ?? ''}`)
    readme.push('')
    readme.push(`Candidat : ${session.candidate_name ?? ''}`)
    if (session.candidate_email)
      readme.push(`Email    : ${session.candidate_email}`)
    if ((session as any).projects?.title)
      readme.push(`Projet   : ${(session as any).projects.title}`)
    if ((session as any).projects?.job_title)
      readme.push(`Poste    : ${(session as any).projects.job_title}`)
    readme.push(`Date     : ${dateStr}`)
    if (durationMin !== null) readme.push(`Durée    : ${durationMin} min`)
    readme.push('')
    readme.push("Contenu de l'archive :")
    fileEntries.forEach((f) => readme.push(`  ${f.name} — ${f.question}`))
    if (missing.length > 0) {
      readme.push('')
      readme.push('Segments indisponibles au moment de la génération :')
      missing.forEach((n) => readme.push(`  ${n}`))
    }
    readme.push('')
    readme.push(
      "Format : vidéo WebM (VP8/Opus), lisible avec VLC, Chrome, Firefox, Edge ou QuickTime (avec extension WebM). Seules les réponses du candidat sont enregistrées en vidéo. La voix de l'assistant IA n'est pas incluse.",
    )
    zip.file('README.txt', readme.join('\n'))

    const zipBlob = await zip.generateAsync({
      type: 'uint8array',
      compression: 'STORE',
    })

    // Upload dans le bucket privé
    const filename = `entretien-${safeName}-${dateStr}.zip`
    const storagePath = `${job.organization_id}/${job.session_id}/${jobId}/${filename}`

    const { error: upErr } = await admin.storage
      .from('video-exports')
      .upload(storagePath, zipBlob, {
        contentType: 'application/zip',
        upsert: true,
      })
    if (upErr) throw new Error(`Upload: ${upErr.message}`)

    // URL signée 7 jours
    const SEVEN_DAYS = 7 * 24 * 60 * 60
    const { data: signed, error: signErr } = await admin.storage
      .from('video-exports')
      .createSignedUrl(storagePath, SEVEN_DAYS)
    if (signErr || !signed?.signedUrl)
      throw new Error(`URL signée: ${signErr?.message || 'inconnue'}`)

    const expiresAt = new Date(Date.now() + SEVEN_DAYS * 1000).toISOString()

    // Met à jour le job
    await admin
      .from('video_export_jobs')
      .update({
        status: 'ready',
        zip_path: storagePath,
        download_url: signed.signedUrl,
        completed_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .eq('id', jobId)

    // Envoie l'email
    const { error: mailErr } = await admin.functions.invoke(
      'send-transactional-email',
      {
        body: {
          templateName: 'video-export-ready',
          recipientEmail: job.recipient_email,
          idempotencyKey: `video-export-${jobId}`,
          templateData: {
            candidateName: session.candidate_name,
            projectTitle: (session as any).projects?.title,
            downloadUrl: signed.signedUrl,
            expiresAt,
            fileCount: fileEntries.length,
          },
        },
      },
    )
    if (mailErr) console.error('[export] email error', mailErr)

    console.log(`[export] job ${jobId} ready (${fileEntries.length} files)`)
  } catch (err: any) {
    console.error(`[export] job ${jobId} failed`, err)
    await admin
      .from('video_export_jobs')
      .update({
        status: 'failed',
        error_message: err?.message ?? 'Erreur inconnue',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Client utilisateur pour valider l'auth + RLS
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const sessionId: string | undefined = body?.sessionId
    if (!sessionId || typeof sessionId !== 'string') {
      return new Response(JSON.stringify({ error: 'sessionId requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Vérifie l'accès à la session via RLS + récupère organization_id
    const { data: session, error: sessErr } = await userClient
      .from('sessions')
      .select('id, organization_id')
      .eq('id', sessionId)
      .single()
    if (sessErr || !session) {
      return new Response(JSON.stringify({ error: 'Session introuvable' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Email du destinataire : profil de l'utilisateur ou email auth
    const recipientEmail =
      body?.recipientEmail || user.email || ''
    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'Adresse email du destinataire introuvable' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Crée le job
    const admin = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: job, error: jobErr } = await admin
      .from('video_export_jobs')
      .insert({
        session_id: sessionId,
        organization_id: session.organization_id,
        requested_by: user.id,
        recipient_email: recipientEmail,
        status: 'pending',
      })
      .select('id')
      .single()
    if (jobErr || !job) {
      return new Response(
        JSON.stringify({ error: jobErr?.message || 'Création du job échouée' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Lance le traitement en arrière-plan
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(processJob(job.id))
    } else {
      processJob(job.id).catch((e) => console.error('[export] bg error', e))
    }

    return new Response(
      JSON.stringify({
        jobId: job.id,
        recipientEmail,
        message:
          "Demande enregistrée. Vous recevrez un email dès que l'archive sera prête.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (err: any) {
    console.error('[request-video-export] error', err)
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Erreur serveur' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
