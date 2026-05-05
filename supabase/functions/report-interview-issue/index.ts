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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    const { sessionId, message } = parsed.data

    // Récupérer la session
    const { data: session, error: sErr } = await supabase
      .from('sessions')
      .select('id, candidate_name, candidate_email, project_id')
      .eq('id', sessionId)
      .maybeSingle()
    if (sErr || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Récupérer le projet
    const { data: project } = await supabase
      .from('projects')
      .select('id, title, job_title, created_by')
      .eq('id', session.project_id)
      .maybeSingle()
    if (!project?.created_by) {
      return new Response(JSON.stringify({ error: 'Project owner not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Email du créateur via profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', project.created_by)
      .maybeSingle()

    let recipientEmail = profile?.email?.trim() || ''
    if (!recipientEmail) {
      // Fallback : auth.users via admin
      const { data: userRes } = await supabase.auth.admin.getUserById(project.created_by)
      recipientEmail = userRes?.user?.email ?? ''
    }
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: 'Recipient email unavailable' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const reportedAt = new Date().toLocaleString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })

    const sessionUrl = `https://interw.ai/sessions/${session.id}`

    const idempotencyKey = `issue-${session.id}-${Date.now()}`

    const invokeRes = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        templateName: 'interview-issue-report',
        recipientEmail,
        idempotencyKey,
        replyTo: session.candidate_email || undefined,
        templateData: {
          candidateName: session.candidate_name || 'Candidat',
          candidateEmail: session.candidate_email || undefined,
          jobTitle: project.job_title || '',
          projectTitle: project.title || '',
          message,
          sessionUrl,
          reportedAt,
        },
      }),
    })

    if (!invokeRes.ok) {
      const txt = await invokeRes.text()
      console.error('send-transactional-email failed', invokeRes.status, txt)
      return new Response(JSON.stringify({ error: 'Email enqueue failed' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('report-interview-issue error', e)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
