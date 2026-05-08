import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface CandidateThankYouProps {
  firstName?: string
  jobTitle?: string
  orgName?: string
  privacyUrl?: string
}

const CandidateThankYouEmail = ({
  firstName,
  jobTitle,
  orgName,
  privacyUrl,
}: CandidateThankYouProps) => {
  const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,'
  const job = jobTitle?.trim() || 'votre poste'
  const org = orgName?.trim() || "l'équipe de recrutement"
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Merci d'avoir passé votre entretien</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Merci pour votre entretien</Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            Merci d'avoir passé votre entretien pour le poste de{' '}
            <strong>{job}</strong> chez <strong>{org}</strong>.
          </Text>
          <Text style={text}>
            Vos réponses ont bien été enregistrées et vont être analysées par l'équipe de recrutement.
            Vous serez recontacté(e) prochainement.
          </Text>
          <Section style={section}>
            <Text style={text}>
              Conformément au RGPD, vous pouvez à tout moment consulter les règles de traitement de vos
              données et demander leur suppression depuis la page suivante :
            </Text>
            {privacyUrl ? (
              <Button href={privacyUrl} style={button}>
                Mes données personnelles
              </Button>
            ) : null}
          </Section>
          <Text style={footer}>À bientôt,<br />L'équipe interw.ai</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CandidateThankYouEmail,
  subject: 'Merci pour votre entretien',
  displayName: 'Remerciement candidat (fin d\'entretien)',
  previewData: {
    firstName: 'Jane',
    jobTitle: 'Office Manager',
    orgName: 'Acme',
    privacyUrl: 'https://interw.ai/session/demo/privacy/sample-token',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '640px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#111827', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 14px' }
const section = { margin: '24px 0', padding: '16px', backgroundColor: '#F3F4F6', borderRadius: '8px' }
const button = {
  backgroundColor: '#6366F1',
  color: '#ffffff',
  padding: '12px 20px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  display: 'inline-block',
  marginTop: '8px',
}
const footer = { fontSize: '12px', color: '#6B7280', margin: '30px 0 0' }
