import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { EmailAPIError, sendLovableEmail } from 'npm:@lovable.dev/email-js@0.1.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from './registry.ts'

// Server-only helper. Wraps Lovable's managed email API and preserves this
// project's own sending behaviour:
//   - `hello@` sender local-part and a monitored default Reply-To
//   - optional per-send display name (`fromName`)
//   - burst de-duplication (same template + recipient within 5 minutes)
//   - the app's own email_send_log audit rows
// Import from edge functions only — never expose sending to the browser.

const SITE_NAME = 'Interw'
// Verified sender subdomain used for the API lookup — never the root domain.
const SENDER_DOMAIN = 'notify.interw.com'
// Domain shown in the From: header (cosmetic).
const FROM_DOMAIN = 'notify.interw.com'
// `hello@` scores better than `noreply@` with Gmail/Outlook.
const FROM_LOCAL_PART = 'hello'
// Monitored inbox used when the caller provides no explicit Reply-To.
const DEFAULT_REPLY_TO = 'contact@interw.com'

export type SendAppEmailResult =
  | { sent: true; messageId: string }
  | { sent: false; messageId: string; reason: 'recipient_suppressed' | 'duplicate' }

export interface SendAppEmailOptions {
  templateData?: Record<string, unknown>
  /** Dedupes retries of the same logical send. */
  idempotencyKey?: string
  replyTo?: string
  /** Display name shown in the From: header for this send. */
  fromName?: string
  /** Stored on the audit row. */
  metadata?: Record<string, unknown> | null
}

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Supabase service configuration is missing')
  return createClient(url, key)
}

async function logSend(
  supabase: ReturnType<typeof createClient>,
  row: {
    message_id: string | null
    template_name: string
    recipient_email: string
    status: 'sent' | 'suppressed' | 'failed'
    error_message?: string | null
    metadata?: Record<string, unknown> | null
  },
): Promise<void> {
  const { error } = await supabase.from('email_send_log').insert(row)
  if (error) {
    console.error('email_send_log insert failed', {
      code: error.code,
      message: error.message,
      status: row.status,
    })
  }
}

/**
 * Renders a registered template and sends it through Lovable's managed email
 * API. Suppression, retries, and rate limits are enforced server-side by
 * Lovable. A suppressed recipient is an expected outcome ({ sent: false }).
 */
export async function sendAppEmail(
  templateName: string,
  to: string,
  options: SendAppEmailOptions = {},
): Promise<SendAppEmailResult> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) throw new Error('LOVABLE_API_KEY is not configured')

  const template = TEMPLATES[templateName]
  if (!template) {
    throw new Error(
      `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`,
    )
  }

  // Template-level `to` wins — notification templates always reach their
  // fixed address.
  const recipient = template.to || to
  if (!recipient) {
    throw new Error('Recipient is required (the template defines no fixed recipient)')
  }

  const messageId = crypto.randomUUID()
  const supabase = serviceClient()

  // Burst guard: an identical template + recipient already sent in the last
  // 5 minutes short-circuits, so a cron re-firing never doubles a send.
  if (options.idempotencyKey) {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('email_send_log')
      .select('id')
      .eq('template_name', templateName)
      .eq('recipient_email', recipient)
      .eq('status', 'sent')
      .gte('created_at', fiveMinAgo)
      .limit(1)
    if (recent && recent.length > 0) {
      console.log('sendAppEmail: duplicate within 5 min, skipping', { templateName })
      await logSend(supabase, {
        message_id: messageId,
        template_name: templateName,
        recipient_email: recipient,
        status: 'suppressed',
        error_message: 'duplicate_idempotency_key',
        metadata: options.metadata ?? null,
      })
      return { sent: false, messageId, reason: 'duplicate' }
    }
  }

  const templateData = (options.templateData ?? {}) as Record<string, unknown>
  const element = React.createElement(template.component, templateData)
  const html = await renderAsync(element)
  const text = await renderAsync(element, { plainText: true })
  const subject =
    typeof template.subject === 'function'
      ? template.subject(templateData as Record<string, any>)
      : template.subject

  const cleanedFromName =
    typeof options.fromName === 'string'
      ? options.fromName.replace(/[<>"\r\n]/g, '').trim().slice(0, 60)
      : ''
  const displayName = cleanedFromName.length > 0 ? cleanedFromName : SITE_NAME

  try {
    await sendLovableEmail(
      {
        to: recipient,
        from: `${displayName} <${FROM_LOCAL_PART}@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: templateName,
        idempotency_key: options.idempotencyKey || messageId,
        reply_to: options.replyTo || DEFAULT_REPLY_TO,
      },
      { apiKey, sendUrl: Deno.env.get('LOVABLE_SEND_URL') },
    )
  } catch (error) {
    if (error instanceof EmailAPIError && error.code === 'recipient_suppressed') {
      await logSend(supabase, {
        message_id: messageId,
        template_name: templateName,
        recipient_email: recipient,
        status: 'suppressed',
        metadata: options.metadata ?? null,
      })
      return { sent: false, messageId, reason: 'recipient_suppressed' }
    }
    const errorMsg = error instanceof Error ? error.message : String(error)
    await logSend(supabase, {
      message_id: messageId,
      template_name: templateName,
      recipient_email: recipient,
      status: 'failed',
      error_message: errorMsg.slice(0, 1000),
      metadata: options.metadata ?? null,
    })
    throw error
  }

  await logSend(supabase, {
    message_id: messageId,
    template_name: templateName,
    recipient_email: recipient,
    status: 'sent',
    metadata: options.metadata ?? null,
  })

  return { sent: true, messageId }
}
