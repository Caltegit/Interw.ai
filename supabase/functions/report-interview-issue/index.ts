import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.23.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().trim().min(5).max(2000),
})

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    let raw: unknown
    try { raw = await req.json() } catch (e) {
      console.error('[report-issue] invalid JSON body', e)
      return json(400, { error: 'Corps de requête invalide (JSON attendu).' })
    }

    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      console.error('[report-issue] validation failed', parsed.error.flatten().fieldErrors)
      return json(400, {
        error: 'Le message doit contenir entre 5 et 2000 caractères.',
        details: parsed.error.flatten().fieldErrors,
      })
    }
    const { sessionId, message } = parsed.data

    console.log('[report-issue] session lookup', { sessionId })
    const { data: session, error: sErr } = await supabase
      .from('sessions')
      .select('id, candidate_name, candidate_email, project_id')
      .eq('id', sessionId)
      .maybeSingle()
    if (sErr) {
      console.error('[report-issue] session query error', sErr)
      return json(500, { error: 'Erreur lors de la recherche de la session.' })
    }
    if (!session) {
      console.error('[report-issue] session not found', { sessionId })
      return json(404, { error: 'Session introuvable.' })
    }

    const { data: project, error: pErr } = await supabase
      .from('projects')
      .select('id, title, job_title')
      .eq('id', session.project_id)
      .maybeSingle()
    if (pErr) console.error('[report-issue] project query error (non bloquant)', pErr)

    console.log('[report-issue] superadmin lookup')
    const { data: superAdmin, error: aErr } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_admin')
      .limit(1)
      .maybeSingle()

    if (aErr) {
      console.error('[report-issue] superadmin query error', aErr)
      return json(500, { error: 'Impossible de récupérer le super admin.' })
    }
    if (!superAdmin?.user_id) {
      console.error('[report-issue] no super admin configured')
      return json(500, { error: 'Aucun super admin configuré pour recevoir le signalement.' })
    }

    const candidateName = session.candidate_name || 'Candidat'
    const jobTitle = project?.job_title || ''
    const projectTitle = project?.title || ''

    const subject = jobTitle
      ? `Signalement candidat — ${candidateName} (${jobTitle})`
      : `Signalement candidat — ${candidateName}`

    console.log('[report-issue] thread insert', { user_id: superAdmin.user_id })
    const { data: thread, error: tErr } = await supabase
      .from('feedback_threads')
      .insert({
        user_id: superAdmin.user_id,
        subject,
        status: 'open',
      })
      .select('id')
      .single()

    if (tErr || !thread) {
      console.error('[report-issue] thread insert failed', tErr)
      return json(500, { error: `Création du fil impossible : ${tErr?.message || 'inconnue'}` })
    }

    const content = [
      'Signalement reçu pendant l\'entretien.',
      '',
      `Candidat : ${candidateName}${session.candidate_email ? ` (${session.candidate_email})` : ''}`,
      jobTitle || projectTitle ? `Poste : ${jobTitle}${projectTitle ? ` — ${projectTitle}` : ''}` : null,
      `Session : https://interw.ai/sessions/${session.id}`,
      '',
      'Message du candidat :',
      message,
    ].filter(Boolean).join('\n')

    console.log('[report-issue] message insert', { thread_id: thread.id })
    const { error: mErr } = await supabase.from('feedback_messages').insert({
      thread_id: thread.id,
      author_id: superAdmin.user_id,
      author_role: 'user',
      content,
    })

    if (mErr) {
      console.error('[report-issue] message insert failed', mErr)
      return json(500, { error: `Enregistrement du message impossible : ${mErr.message}` })
    }

    console.log('[report-issue] success', { thread_id: thread.id })
    return json(200, { ok: true, threadId: thread.id })
  } catch (e) {
    console.error('[report-issue] unexpected error', e)
    return json(500, { error: (e as Error)?.message || 'Erreur interne.' })
  }
})
