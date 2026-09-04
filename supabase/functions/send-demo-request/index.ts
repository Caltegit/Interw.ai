// Demande de démo depuis la landing page (formulaire public).
// Valide l'entrée, limite le débit par IP, puis envoie l'e-mail interne.
import { sendAppEmail } from '../_shared/transactional-email-templates/send-app-email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Limite de débit en mémoire : 3 demandes / 10 min par IP.
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 3
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const list = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (list.length >= RATE_MAX) {
    hits.set(ip, list)
    return true
  }
  list.push(now)
  hits.set(ip, list)
  return false
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  if (rateLimited(ip)) return json(429, { error: 'Trop de demandes, réessayez plus tard.' })

  let email = ''
  let message = ''
  try {
    const body = await req.json()
    email = String(body?.email ?? '').trim().toLowerCase()
    message = String(body?.message ?? '').trim().slice(0, 2000)
  } catch {
    return json(400, { error: 'Requête invalide' })
  }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json(400, { error: 'Adresse e-mail invalide' })
  }

  try {
    await sendAppEmail('demo-request', email, {
      idempotencyKey: `demo-request-${email}`,
      replyTo: email,
      templateData: { email, message },
    })
    return json(200, { ok: true })
  } catch (e) {
    console.error('send-demo-request failed', e)
    return json(500, { error: "L'envoi a échoué." })
  }
})
