import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string') return 'Mot de passe invalide.'
  if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.'
  if (!/[A-Za-z]/.test(password)) return 'Le mot de passe doit contenir au moins une lettre.'
  if (!/\d/.test(password)) return 'Le mot de passe doit contenir au moins un chiffre.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Le mot de passe doit contenir au moins un caractère spécial.'
  return null
}

async function hashCode(code: string, email: string, userId: string, secret: string): Promise<string> {
  const data = new TextEncoder().encode(`${code}:${email}:${userId}:${secret}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceKey) {
    console.error('complete-password-reset: missing backend env')
    return json({ error: 'Erreur serveur' }, 500)
  }

  let email = ''
  let code = ''
  let password = ''
  try {
    const body = await req.json()
    email = normalizeEmail(body.email)
    code = typeof body.code === 'string' ? body.code.trim() : ''
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return json({ error: 'Requête invalide' }, 400)
  }

  if (!email || !/^\d{6}$/.test(code)) return json({ error: 'Code incorrect ou expiré' }, 400)
  const passwordError = validatePassword(password)
  if (passwordError) return json({ error: passwordError }, 400)

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: resetCode, error: lookupError } = await admin
    .from('password_reset_codes')
    .select('id, user_id, code_hash, expires_at, attempts, max_attempts, consumed_at')
    .eq('email', email)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lookupError) {
    console.error('complete-password-reset lookup failed', lookupError)
    return json({ error: 'Erreur serveur' }, 500)
  }

  if (!resetCode || new Date(resetCode.expires_at).getTime() <= Date.now() || resetCode.attempts >= resetCode.max_attempts) {
    return json({ error: 'Code incorrect ou expiré' }, 400)
  }

  const submittedHash = await hashCode(code, email, resetCode.user_id, Deno.env.get('PASSWORD_RESET_CODE_PEPPER') || serviceKey)
  if (submittedHash !== resetCode.code_hash) {
    await admin
      .from('password_reset_codes')
      .update({ attempts: resetCode.attempts + 1 })
      .eq('id', resetCode.id)
    return json({ error: 'Code incorrect ou expiré' }, 400)
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(resetCode.user_id, { password })
  if (updateError) {
    console.error('complete-password-reset update failed', updateError)
    return json({ error: 'Impossible de mettre à jour le mot de passe' }, 500)
  }

  await admin
    .from('password_reset_codes')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', resetCode.id)

  return json({ success: true })
})