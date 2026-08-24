import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.23.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EventSchema = z.object({
  event: z.string().min(1).max(200),
  data: z.record(z.unknown()).default({}),
  ts: z.string().optional(),
})

const BodySchema = z.object({
  sessionToken: z.string().min(1).max(200),
  events: z.array(EventSchema).min(1).max(50),
})

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

/**
 * Parse le User-Agent pour extraire navigateur, version, OS, type d'appareil.
 * Réplique légère de la logique côté client (browserCompat.ts) — on n'a pas
 * accès au JS du navigateur ici, donc on parse le header HTTP.
 */
function parseUserAgent(ua: string): {
  browser: string
  browserVersion: string | null
  os: string
  deviceType: string
} {
  let browser = 'Inconnu'
  let browserVersion: string | null = null

  const browserTests: Array<[string, RegExp]> = [
    ['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/i],
    ['Opera', /OPR\/([\d.]+)/i],
    ['Firefox iOS', /FxiOS\/([\d.]+)/i],
    ['Chrome iOS', /CriOS\/([\d.]+)/i],
    ['Firefox', /Firefox\/([\d.]+)/i],
    ['Chrome', /Chrome\/([\d.]+)/i],
    ['Safari', /Version\/([\d.]+).*Safari/i],
    ['Safari', /Safari\/([\d.]+)/i],
  ]
  for (const [name, re] of browserTests) {
    const m = ua.match(re)
    if (m) { browser = name; browserVersion = m[1] ?? null; break }
  }

  let os = 'Inconnu'
  if (/Windows NT 10/i.test(ua)) os = 'Windows'
  else if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Mac OS X/i.test(ua)) os = 'macOS'
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/Linux/i.test(ua)) os = 'Linux'

  let deviceType = 'desktop'
  if (/iPhone|Android.*Mobile|Mobile/i.test(ua)) deviceType = 'mobile'
  else if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) deviceType = 'tablet'

  return { browser, browserVersion, os, deviceType }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    let raw: unknown
    try { raw = await req.json() } catch {
      return json(400, { error: 'Corps de requête invalide (JSON attendu).' })
    }

    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return json(400, { error: 'Données invalides.', details: parsed.error.flatten().fieldErrors })
    }
    const { sessionToken, events } = parsed.data

    // Valide le token candidat et récupère l'ID de session.
    const { data: sessionId, error: tokenErr } = await supabase
      .rpc('get_session_id_by_token', { _token: sessionToken })
      .single()

    if (tokenErr || !sessionId) {
      return json(404, { error: 'Session introuvable pour ce token.' })
    }

    // Parse le User-Agent envoyé par le navigateur du candidat.
    const ua = req.headers.get('user-agent') ?? ''
    const { browser, browserVersion, os, deviceType } = parseUserAgent(ua)

    const rows = events.map((e) => ({
      session_id: sessionId,
      event: e.event,
      data: e.data,
      user_agent: ua,
      browser,
      browser_version: browserVersion,
      os,
      device_type: deviceType,
      created_at: e.ts ?? new Date().toISOString(),
    }))

    const { error: insertErr } = await supabase
      .from('mic_events')
      .insert(rows)

    if (insertErr) {
      console.error('[log-mic-events] insert failed', insertErr)
      return json(500, { error: 'Échec de l\\'enregistrement des événements.' })
    }

    return json(200, { ok: true, inserted: rows.length })
  } catch (e) {
    console.error('[log-mic-events] unexpected error', e)
    return json(500, { error: (e as Error)?.message || 'Erreur interne.' })
  }
})
