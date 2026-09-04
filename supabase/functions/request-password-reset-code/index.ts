import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { EmailAPIError, sendLovableEmail } from 'npm:@lovable.dev/email-js@0.1.0'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'interw'
const SENDER_DOMAIN = 'notify.interw.com'
const FROM_DOMAIN = 'notify.interw.com'
const FROM_NAME = 'Interw'
const FROM_LOCAL_PART = 'hello'
const REPLY_TO_EMAIL = 'hello@interw.com'
const CODE_TTL_MINUTES = 15
const RESEND_WINDOW_MINUTES = 1

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

function generateSixDigitCode(): string {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return String(bytes[0] % 1_000_000).padStart(6, '0')
}

async function hashCode(code: string, email: string, userId: string, secret: string): Promise<string> {
  const data = new TextEncoder().encode(`${code}:${email}:${userId}:${secret}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function findUserIdByEmail(admin: any, email: string): Promise<string | null> {
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('user_id')
    .eq('email', email)
    .maybeSingle()

  if (!profileError && profile?.user_id) return profile.user_id

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const found = data.users.find((user: any) => (user.email ?? '').toLowerCase() === email)
    if (found) return found.id
    if (data.users.length < 200) break
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceKey) {
    console.error('request-password-reset-code: missing backend env')
    return json({ error: 'Erreur serveur' }, 500)
  }

  let email = ''
  try {
    const body = await req.json()
    email = normalizeEmail(body.email)
  } catch {
    return json({ success: true })
  }

  if (!email || !email.includes('@')) return json({ success: true })

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const since = new Date(Date.now() - RESEND_WINDOW_MINUTES * 60 * 1000).toISOString()
    const { data: recent } = await admin
      .from('password_reset_codes')
      .select('id')
      .eq('email', email)
      .is('consumed_at', null)
      .gte('created_at', since)
      .limit(1)

    if (recent && recent.length > 0) return json({ success: true })

    const userId = await findUserIdByEmail(admin, email)
    if (!userId) return json({ success: true })

    const code = generateSixDigitCode()
    console.log('password reset code generated', { code_length: code.length })
    const codeHash = await hashCode(code, email, userId, Deno.env.get('PASSWORD_RESET_CODE_PEPPER') || serviceKey)
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString()

    await admin
      .from('password_reset_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('email', email)
      .is('consumed_at', null)

    const { error: insertError } = await admin.from('password_reset_codes').insert({
      email,
      user_id: userId,
      code_hash: codeHash,
      expires_at: expiresAt,
    })

    if (insertError) throw insertError

    const templateProps = { siteName: SITE_NAME, token: code }
    const html = await renderAsync(React.createElement(RecoveryEmail, templateProps))
    const text = await renderAsync(React.createElement(RecoveryEmail, templateProps), { plainText: true })
    const messageId = crypto.randomUUID()

    try {
      await sendLovableEmail(
        {
          to: email,
          from: `${FROM_NAME} <${FROM_LOCAL_PART}@${FROM_DOMAIN}>`,
          reply_to: REPLY_TO_EMAIL,
          sender_domain: SENDER_DOMAIN,
          subject: 'Votre code de réinitialisation',
          html,
          text,
          purpose: 'transactional',
          label: 'recovery',
          idempotency_key: `password-reset-${email}-${Date.now()}`,
        },
        { apiKey: Deno.env.get('LOVABLE_API_KEY')!, sendUrl: Deno.env.get('LOVABLE_SEND_URL') },
      )
      await admin.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'recovery',
        recipient_email: email,
        status: 'sent',
        metadata: { source: 'password_reset_code_6_digits' },
      })
    } catch (sendError) {
      const suppressed = sendError instanceof EmailAPIError && sendError.code === 'recipient_suppressed'
      await admin.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'recovery',
        recipient_email: email,
        status: suppressed ? 'suppressed' : 'failed',
        error_message: suppressed
          ? null
          : (sendError instanceof Error ? sendError.message : String(sendError)).slice(0, 1000),
        metadata: { source: 'password_reset_code_6_digits' },
      })
      if (!suppressed) throw sendError
    }

    return json({ success: true })
  } catch (error) {
    console.error('request-password-reset-code failed', error)
    return json({ success: true })
  }
})