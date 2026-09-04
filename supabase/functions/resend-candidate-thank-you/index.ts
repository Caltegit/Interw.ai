// Renvoi manuel de l'e-mail de remerciement candidat depuis la console admin.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendAppEmail } from '../_shared/transactional-email-templates/send-app-email.ts'
import { requireCallerOrInternal, SHARED_CORS } from '../_shared/auth-guard.ts'

const CORS = { ...SHARED_CORS, 'Access-Control-Allow-Methods': 'POST, OPTIONS' }

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

  let sessionId = ''
  try {
    const body = await req.json()
    sessionId = String(body?.sessionId ?? '')
  } catch {
    return json(400, { error: 'Requête invalide' })
  }
  if (!sessionId) return json(400, { error: 'sessionId requis' })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  if (!caller.internal) {
    const { data: isAdmin } = await admin.rpc('is_super_admin', { _user_id: caller.userId })
    if (!isAdmin) return json(403, { error: 'Forbidden' })
  }

  // Le destinataire vient de la base, jamais du navigateur.
  const { data: session } = await admin
    .from('sessions')
    .select('id, candidate_name, candidate_email, project:projects(title, job_title, organization_id)')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session?.candidate_email) return json(404, { error: 'Session introuvable' })

  // deno-lint-ignore no-explicit-any
  const project: any = Array.isArray((session as any).project)
    ? (session as any).project[0]
    : (session as any).project
  let orgName = ''
  if (project?.organization_id) {
    const { data: org } = await admin
      .from('organizations')
      .select('name')
      .eq('id', project.organization_id)
      .maybeSingle()
    orgName = org?.name ?? ''
  }

  try {
    const result = await sendAppEmail('candidate-thank-you', session.candidate_email, {
      idempotencyKey: `candidate-thanks-${sessionId}-manual-${Date.now()}`,
      templateData: {
        firstName: String(session.candidate_name ?? '').trim().split(/\s+/)[0] ?? '',
        jobTitle: project?.job_title || project?.title || '',
        orgName,
      },
    })
    return json(200, result)
  } catch (e) {
    console.error('resend-candidate-thank-you failed', e)
    return json(500, { error: "L'envoi a échoué." })
  }
})
