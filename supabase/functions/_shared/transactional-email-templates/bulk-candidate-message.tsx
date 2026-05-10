import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Html, Link, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface BulkCandidateMessageProps {
  subject?: string
  body?: string
  firstName?: string
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g

const renderWithLinks = (text: string, keyPrefix: string) => {
  const parts = text.split(URL_REGEX)
  return parts.map((part, i) =>
    URL_REGEX.test(part) ? (
      <Link key={`${keyPrefix}-${i}`} href={part} style={link}>{part}</Link>
    ) : (
      <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>
    ),
  )
}

const BulkCandidateMessageEmail = ({
  body = '',
}: BulkCandidateMessageProps) => {
  const paragraphs = (body || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>{paragraphs[0]?.slice(0, 80) || 'Message'}</Preview>
      <Body style={main}>
        <Container style={container}>
          {paragraphs.map((p, i) => (
            <Text key={i} style={text}>
              {p.split('\n').map((line, j, arr) => (
                <React.Fragment key={j}>
                  {renderWithLinks(line, `${i}-${j}`)}
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
    body: "Bonjour Jane,\n\nMerci pour le temps consacré à votre entretien.\n\nÀ bientôt,\n\nL'équipe de recrutement",
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '640px', margin: '0 auto' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 14px' }
const link = { color: '#6366F1', textDecoration: 'underline' }
