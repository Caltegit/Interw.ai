import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  prenom?: string
  sessionName?: string
  sessionUrl?: string
}

const CandidateAbandonReminderEmail = ({ prenom, sessionName, sessionUrl }: Props) => {
  const name = (prenom && prenom.trim()) || ''
  const session = (sessionName && sessionName.trim()) || 'votre entretien'
  const url = sessionUrl || 'https://interw.com'

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Reprenez votre entretien : {session}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>Interw</Text>
          </Section>

          <Heading style={h1}>Abandon&nbsp;?</Heading>

          <Text style={text}>Bonjour{name ? ` ${name}` : ''},</Text>

          <Text style={text}>
            Il semble que vous ayez abandonné la session&nbsp;: «&nbsp;<strong>{session}</strong>&nbsp;».
          </Text>

          <Text style={text}>Vous pouvez cliquer ici pour la recommencer&nbsp;:</Text>

          <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
            <Button href={url} style={button}>Reprendre l'entretien</Button>
          </Section>

          <Text style={textMuted}>
            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur&nbsp;:<br />
            <Link href={url} style={footerLink}>{url}</Link>
          </Text>

          <Text style={text}>À bientôt,<br />L'équipe Interw</Text>
        </Container>
      </Body>
    </Html>
  )
}


export const template = {
  component: CandidateAbandonReminderEmail,
  subject: (data: Record<string, any>) =>
    `Abandon ? Sur « ${(data?.sessionName && String(data.sessionName).trim()) || 'votre entretien'} »`,
  displayName: 'Relance candidat (abandon)',
  previewData: {
    prenom: 'Jane',
    sessionName: 'Office Manager - Acme',
    sessionUrl: 'https://interw.com/session/demo/start/sample-token',
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
const hr = { borderColor: '#E5E7EB', margin: '32px 0 16px' }
const footer = { padding: '0' }
const footerText = { fontSize: '12px', color: '#6B7280', lineHeight: '1.5', margin: '0 0 4px' }
const footerLink = { color: '#6366F1', textDecoration: 'none' }
