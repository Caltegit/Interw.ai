import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'interw.ai'
const PRIMARY = '#6366F1'

interface Props {
  candidateName?: string
  candidateEmail?: string
  jobTitle?: string
  projectTitle?: string
  message?: string
  sessionUrl?: string
  reportedAt?: string
}

const InterviewIssueEmail = ({
  candidateName = 'Candidat',
  candidateEmail,
  jobTitle = '',
  projectTitle = '',
  message = '',
  sessionUrl,
  reportedAt,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{`Problème signalé par ${candidateName} pendant son entretien`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>⚠️ Problème signalé par un candidat</Heading>
        <Text style={subtitle}>
          <strong>{candidateName}</strong>
          {jobTitle ? <> — {jobTitle}</> : null}
          {projectTitle ? <><br /><span style={muted}>{projectTitle}</span></> : null}
        </Text>

        {candidateEmail ? (
          <Text style={muted}>
            Email candidat : <a href={`mailto:${candidateEmail}`} style={link}>{candidateEmail}</a>
          </Text>
        ) : null}

        <Section style={messageBox}>
          <Text style={messageLabel}>Message du candidat</Text>
          <Text style={messageText}>{message}</Text>
        </Section>

        {reportedAt ? (
          <Text style={muted}>Signalé le {reportedAt}</Text>
        ) : null}

        <Text style={text}>
          L'entretien a été automatiquement mis en pause. Le candidat peut le reprendre à tout moment.
        </Text>

        {sessionUrl ? (
          <Button href={sessionUrl} style={primaryButton}>Voir la session</Button>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>
          Vous pouvez répondre directement à cet email pour contacter le candidat.
          <br />
          Envoyé par {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InterviewIssueEmail,
  subject: (data: Record<string, any>) =>
    `⚠️ Problème signalé — ${data?.candidateName ?? 'Candidat'}${data?.jobTitle ? ` (${data.jobTitle})` : ''}`,
  displayName: 'Signalement de problème',
  previewData: {
    candidateName: 'Jane Doe',
    candidateEmail: 'jane@example.com',
    jobTitle: 'Développeuse Full-Stack',
    projectTitle: 'Recrutement Q1 2026',
    message: 'Le micro coupe régulièrement et je dois répéter mes réponses. Pouvez-vous m\'aider ?',
    sessionUrl: 'https://interw.ai/sessions/abc',
    reportedAt: '5 mai 2026 à 14:32',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '640px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px' }
const subtitle = { fontSize: '15px', color: '#374151', margin: '0 0 4px' }
const muted = { fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '12px 0' }
const link = { color: PRIMARY, textDecoration: 'underline' }
const messageBox = {
  backgroundColor: '#FEF3C7',
  borderLeft: `4px solid #F59E0B`,
  borderRadius: '6px',
  padding: '14px 16px',
  margin: '16px 0',
}
const messageLabel = {
  fontSize: '12px',
  fontWeight: 'bold' as const,
  color: '#92400E',
  margin: '0 0 6px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}
const messageText = {
  fontSize: '15px',
  color: '#111827',
  margin: '0',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap' as const,
}
const primaryButton = {
  backgroundColor: PRIMARY,
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 'bold',
  display: 'inline-block',
  margin: '8px 0 16px',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#6b7280', lineHeight: '1.5', margin: '16px 0 0' }
