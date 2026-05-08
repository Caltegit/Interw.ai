import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface BulkCandidateMessageProps {
  subject?: string
  body?: string
  firstName?: string
}

const BulkCandidateMessageEmail = ({
  body = '',
  firstName,
}: BulkCandidateMessageProps) => {
  const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,'
  // Render body preserving line breaks (no raw HTML — React escapes everything).
  const paragraphs = (body || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>{greeting}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={text}>{greeting}</Text>
          {paragraphs.map((p, i) => (
            <Text key={i} style={text}>
              {p.split('\n').map((line, j, arr) => (
                <React.Fragment key={j}>
                  {line}
                  {j < arr.length - 1 ? <br /> : null}
                </React.Fragment>
              ))}
            </Text>
          ))}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: BulkCandidateMessageEmail,
  subject: (data: Record<string, any>) => data?.subject || 'Message',
  displayName: 'Message candidat (groupé)',
  previewData: {
    subject: 'Refus - Recrutement Q1 2025',
    firstName: 'Jane',
    body: "Merci pour le temps consacré à votre entretien.\n\nAprès étude de votre candidature, nous ne donnerons pas suite.",
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '640px', margin: '0 auto' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 14px' }
