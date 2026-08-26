import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'interw'
const PRIMARY = '#6366F1'

interface Props {
  authorName?: string
  authorEmail?: string
  subject?: string
  message?: string
  threadUrl?: string
  submittedAt?: string
}

const FeedbackCopyEmail = ({
  authorName = 'Utilisateur',
  authorEmail = '',
  subject = '',
  message = '',
  threadUrl,
  submittedAt,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{`Nouveau feedback de ${authorName}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nouveau feedback</Heading>

        <Text style={muted}>
          <strong style={{ color: '#111827' }}>{authorName}</strong>
          {authorEmail ? <> — <a href={`mailto:${authorEmail}`} style={link}>{authorEmail}</a></> : null}
        </Text>

        {subject ? <Text style={subjectStyle}>{subject}</Text> : null}

        <Section style={messageBox}>
          <Text style={messageText}>{message}</Text>
        </Section>

        {submittedAt ? <Text style={muted}>Envoyé le {submittedAt}</Text> : null}

        {threadUrl ? (
          <Text style={text}>
            <a href={threadUrl} style={link}>Ouvrir le fil</a>
          </Text>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>Envoyé par {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FeedbackCopyEmail,
  subject: (data: Record<string, any>) =>
    `Nouveau feedback — ${data?.authorName ?? 'Utilisateur'}${data?.subject ? ` : ${data.subject}` : ''}`,
  displayName: 'Copie feedback interne',
  previewData: {
    authorName: 'Jane Doe',
    authorEmail: 'jane@example.com',
    subject: 'Bug sur la création de poste',
    message: 'Quand je clique sur enregistrer, rien ne se passe.',
    threadUrl: 'https://interw.com/feedback/abc',
    submittedAt: '5 mai 2026 à 14:32',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '640px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#111827', margin: '0 0 12px' }
const subjectStyle = { fontSize: '16px', fontWeight: 'bold' as const, color: '#111827', margin: '8px 0 4px' }
const muted = { fontSize: '13px', color: '#6b7280', margin: '0 0 12px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '12px 0' }
const link = { color: PRIMARY, textDecoration: 'underline' }
const messageBox = {
  backgroundColor: '#F3F4F6',
  borderLeft: `4px solid ${PRIMARY}`,
  borderRadius: '6px',
  padding: '14px 16px',
  margin: '16px 0',
}
const messageText = {
  fontSize: '15px',
  color: '#111827',
  margin: '0',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap' as const,
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#6b7280', margin: '16px 0 0' }
