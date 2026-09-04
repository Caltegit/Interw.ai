// Copie interne d'un nouveau fil de feedback vers la boîte de l'équipe.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendAppEmail } from '../_shared/transactional-email-templates/send-app-email.ts'
import { requireCallerOrInternal, SHARED_CORS } from '../_shared/auth-guard.ts'

const CORS = { ...SHARED_CORS, 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const TEAM_INBOX = 'hello@interw.ai'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const caller = await requireCallerOrInternal(req, CORS)
  if (!caller.ok) return caller.response

  let threadId = ''
  let appUrl = 'https://interw.com'
  try {
    const body = await req.json()
    threadId = String(body?.threadId ?? '')
    if (typeof body?.appUrl === 'string' && body.appUrl.startsWith('https://')) {
      appUrl = body.appUrl.replace(/\/$/, '')
    }
  } catch {
    return json(400, { error: 'Requête invalide' })
  }
  if (!threadId) return json(400, { error: 'threadId requis' })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Sujet, message et auteur proviennent de la base, pas du navigateur.
  const { data: thread } = await admin
    .from('feedback_threads')
    .select('id, subject, created_by, created_at')
    .eq('id', threadId)
    .maybeSingle()

  if (!thread) return json(404, { error: 'Fil introuvable' })
  if (!caller.internal && thread.created_by !== caller.userId) {
    return json(403, { error: 'Forbidden' })
  }

  const { data: firstMessage } = await admin
    .from('feedback_messages')
    .select('content')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email')
    .eq('user_id', thread.created_by)
    .maybeSingle()

  try {
    const result = await sendAppEmail('feedback-copy', TEAM_INBOX, {
      idempotencyKey: `feedback-copy-${threadId}`,
      templateData: {
        authorName: profile?.full_name?.trim() || profile?.email || 'Utilisateur',
        authorEmail: profile?.email ?? '',
        subject: thread.subject ?? '',
        message: firstMessage?.content ?? '',
        threadUrl: `${appUrl}/feedback/${threadId}`,
        submittedAt: new Date(thread.created_at ?? Date.now()).toLocaleString('fr-FR', {
          dateStyle: 'long',
          timeStyle: 'short',
        }),
      },
    })
    return json(200, result)
  } catch (e) {
    console.error('send-feedback-copy failed', e)
    return json(500, { error: "L'envoi a échoué." })
  }
})
