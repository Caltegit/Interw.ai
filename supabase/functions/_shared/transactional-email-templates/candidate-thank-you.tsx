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
  customSubject?: string
  customBody?: string
}

const DEFAULT_SUBJECT = "Merci pour votre entretien"

function substitute(text: string, vars: Record<string, string>): string {
  return text
    .replace(/\{firstName\}/g, vars.firstName || '')
    .replace(/\{jobTitle\}/g, vars.jobTitle || '')
    .replace(/\{orgName\}/g, vars.orgName || '')
    .replace(/Bonjour ,/g, 'Bonjour,')
}

const CandidateThankYouEmail = ({
  firstName,
  jobTitle,
  orgName,
  privacyUrl,
  customBody,
}: CandidateThankYouProps) => {
  const vars = {
    firstName: firstName || '',
    jobTitle: (jobTitle && jobTitle.trim()) || 'votre poste',
    orgName: (orgName && orgName.trim()) || "l'équipe de recrutement",
  }
  const bodyText = customBody && customBody.trim()
    ? substitute(customBody, vars)
    : substitute(
        `Bonjour {firstName},\n\nMerci d'avoir passé votre entretien pour le poste de {jobTitle} chez {orgName}.\n\nVos réponses ont bien été enregistrées et vont être analysées par l'équipe de recrutement. Vous serez recontacté(e) prochainement.\n\nÀ bientôt,\nL'équipe de recrutement`,
        vars,
      )
  const paragraphs = bodyText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Merci d'avoir passé votre entretien</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Merci pour votre entretien</Heading>
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
          {/* Encart RGPD — TOUJOURS présent, non modifiable */}
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
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CandidateThankYouEmail,
  subject: (data: Record<string, any>) => {
    const custom = (data?.customSubject as string | undefined)?.trim()
    return custom || DEFAULT_SUBJECT
  },
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
