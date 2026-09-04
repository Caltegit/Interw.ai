// Message recruteur -> candidat (envoi groupé côté client, un destinataire par appel).
// Utilisé par la boîte de dialogue « E-mail groupé » et le partage de rapports.
import { sendAppEmail } from '../_shared/transactional-email-templates/send-app-email.ts'
import { requireCallerOrInternal, SHARED_CORS } from '../_shared/auth-guard.ts'

const CORS = { ...SHARED_CORS, 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

  let payload: Record<string, any>
  try {
    payload = await req.json()
  } catch {
    return json(400, { error: 'Requête invalide' })
  }

  const recipient = String(payload?.recipientEmail ?? '').trim().toLowerCase()
  const subject = String(payload?.subject ?? '').trim()
  const body = String(payload?.body ?? '')
  const firstName = String(payload?.firstName ?? '')
  const fromName = payload?.fromName ? String(payload.fromName) : undefined
  const replyTo = payload?.replyTo ? String(payload.replyTo) : undefined
  const idempotencyKey = payload?.idempotencyKey ? String(payload.idempotencyKey) : undefined

  if (!EMAIL_RE.test(recipient)) return json(400, { error: 'Adresse invalide' })
  if (!subject || !body) return json(400, { error: 'Sujet et message requis' })

  try {
    const result = await sendAppEmail('bulk-candidate-message', recipient, {
      idempotencyKey,
      fromName,
      replyTo,
      templateData: { subject, body, firstName },
    })
    return json(200, result)
  } catch (e) {
    console.error('send-candidate-message failed', e)
    return json(500, { error: "L'envoi a échoué." })
  }
})
