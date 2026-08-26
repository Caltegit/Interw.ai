import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  prenom?: string
  poste?: string
  entreprise?: string
  cta_link?: string
  subject_override?: string
  intro_html?: string
  outro_html?: string
}

const DEFAULT_SUBJECT = 'Nous vous invitons à repasser votre entretien'

function substitute(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(prenom|poste|entreprise)\}/g, (_, k) => vars[k] ?? '')
}

// Sanitiseur minimal — n'autorise que <strong>, <em>, <br>, <p>, <a>.
function sanitizeHtml(html: string): string {
  if (!html) return ''
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/on[a-z]+\s*=\s*(["'])[\s\S]*?\1/gi, '')
    .replace(/javascript:/gi, '')
  s = s.replace(/<(?!\/?(strong|em|br|p|a)(\s|>|\/))/gi, '&lt;')
  return s
}

const CandidateRecoveryInviteEmail = ({
  prenom, poste, entreprise, cta_link, intro_html, outro_html,
}: Props) => {
  const name = (prenom && prenom.trim()) || ''
  const jobTitle = (poste && poste.trim()) || 'le poste'
  const company = (entreprise && entreprise.trim()) || ''
  const url = cta_link || 'https://interw.com'
  const vars = { prenom: name, poste: jobTitle, entreprise: company }

  const introRendered = intro_html && intro_html.trim()
    ? sanitizeHtml(substitute(intro_html, vars))
    : null
  const outroRendered = outro_html && outro_html.trim()
    ? sanitizeHtml(substitute(outro_html, vars))
    : null

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Nous vous invitons à repasser votre entretien</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>Interw</Text>
          </Section>

          <Heading style={h1}>Nous vous invitons à repasser votre entretien</Heading>

          {introRendered ? (
            <div style={text} dangerouslySetInnerHTML={{ __html: introRendered }} />
          ) : (
            <>
              <Text style={text}>Bonjour{name ? ` ${name}` : ''},</Text>
              <Text style={text}>
                Suite à un incident technique survenu entre le 9 et le 15 juillet, votre entretien
                {' '}pour «&nbsp;<strong>{jobTitle}</strong>&nbsp;»{company ? <> chez <strong>{company}</strong></> : null}
                {' '}n'a pas pu être enregistré. Nous en sommes sincèrement désolés.
              </Text>
              <Text style={text}>
                Nous vous invitons à le repasser via le lien ci-dessous. Vous disposez de 7&nbsp;jours.
              </Text>
            </>
          )}

          <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
            <Button href={url} style={button}>Repasser l'entretien</Button>
          </Section>

          <Text style={textMuted}>
            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur&nbsp;:<br />
            <Link href={url} style={footerLink}>{url}</Link>
          </Text>

          {outroRendered ? (
            <div style={text} dangerouslySetInnerHTML={{ __html: outroRendered }} />
          ) : (
            <>
              <Text style={text}>
                Si vous rencontrez la moindre difficulté, répondez à cet e-mail — nous vous accompagnons.
              </Text>
              <Text style={text}>L'équipe Interw</Text>
            </>
          )}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CandidateRecoveryInviteEmail,
  subject: (data: Record<string, any> = {}) => {
    const override = typeof data.subject_override === 'string' ? data.subject_override.trim() : ''
    return override || DEFAULT_SUBJECT
  },
  displayName: 'Reprise entretien (incident juillet 2026)',
  previewData: {
    prenom: 'Camille',
    poste: 'Office Manager',
    entreprise: 'Acme',
    cta_link: 'https://interw.com/session/demo/start/sample-token',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '640px', margin: '0 auto' }
const header = { padding: '0 0 16px', borderBottom: '1px solid #E5E7EB', marginBottom: '24px' }
const brand = { fontSize: '20px', fontWeight: 'bold' as const, color: '#6366F1', margin: '0', letterSpacing: '-0.01em' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#111827', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 14px' }
const textMuted = { fontSize: '13px', color: '#6B7280', lineHeight: '1.6', margin: '0 0 14px', wordBreak: 'break-all' as const }
const button = {
  backgroundColor: '#6366F1',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  display: 'inline-block',
}
const footerLink = { color: '#6366F1', textDecoration: 'none' }
