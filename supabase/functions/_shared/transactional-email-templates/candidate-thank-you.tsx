import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
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

function substitute(text: string, vars: Record<string, string>): string {
  return text
    .replace(/\{firstName\}/g, vars.firstName || '')
    .replace(/\{jobTitle\}/g, vars.jobTitle || '')
    .replace(/\{orgName\}/g, vars.orgName || '')
    .replace(/Bonjour ,/g, 'Bonjour,')
}

function buildSubject(data: Record<string, any>): string {
  const custom = (data?.customSubject as string | undefined)?.trim()
  if (custom) {
    return substitute(custom, {
      firstName: data?.firstName || '',
      jobTitle: (data?.jobTitle && String(data.jobTitle).trim()) || 'votre poste',
      orgName: (data?.orgName && String(data.orgName).trim()) || '',
    })
  }
  const jobTitle = (data?.jobTitle && String(data.jobTitle).trim()) || 'votre poste'
  return `Merci pour cet entretien : « ${jobTitle} »`
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
        `Bonjour {firstName},\n\nMerci d'avoir passé cet entretien pour le poste {jobTitle}.\n\nLes réponses sont bien enregistrées et vont être analysées par l'équipe. En cas de profil retenu, un retour sera fait rapidement pour passer à l'étape suivante.\n\nÀ bientôt,\n\nL'équipe recrutement`,
        vars,
      )
  const paragraphs = bodyText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Confirmation de votre entretien pour {vars.jobTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* En-tête identité */}
          <Section style={header}>
            <Text style={brand}>Interw</Text>
          </Section>

          {/* Justification contextuelle (signal positif pour les filtres) */}
          <Text style={context}>
            Vous recevez cet email car vous venez de passer un entretien pour le poste de
            {' '}<strong>{vars.jobTitle}</strong>{orgName ? <> chez <strong>{vars.orgName}</strong></> : null}.
          </Text>

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
            <Text style={textMuted}>
              Conformément au RGPD, vous pouvez à tout moment consulter les règles de traitement
              de vos données personnelles et demander leur suppression depuis la page suivante :
            </Text>
            {privacyUrl ? (
              <Button href={privacyUrl} style={button}>
                Gérer mes données personnelles
              </Button>
            ) : null}
          </Section>

          <Hr style={hr} />

          {/* Footer identitaire */}
          <Section style={footer}>
            <Text style={footerText}>
              <strong>Interw</strong> — Plateforme d'entretien digitale
            </Text>
            <Text style={footerText}>
              <Link href="https://interw.com" style={footerLink}>interw</Link>
              {' · '}
              <Link href="mailto:contact@interw.com" style={footerLink}>contact@interw.com</Link>
            </Text>
            {firstName ? (
              <Text style={footerHint}>
                Si vous n'êtes pas {firstName}, vous pouvez ignorer ce message en toute sécurité.
              </Text>
            ) : null}
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CandidateThankYouEmail,
  subject: buildSubject,
  displayName: 'Remerciement candidat (fin d\'entretien)',
  previewData: {
    firstName: 'Jane',
    jobTitle: 'Office Manager',
    orgName: 'Acme',
    privacyUrl: 'https://interw.com/session/demo/privacy/sample-token',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '640px', margin: '0 auto' }
const header = { padding: '0 0 16px', borderBottom: '1px solid #E5E7EB', marginBottom: '24px' }
const brand = { fontSize: '20px', fontWeight: 'bold' as const, color: '#6366F1', margin: '0', letterSpacing: '-0.01em' }
const context = { fontSize: '13px', color: '#6B7280', lineHeight: '1.6', margin: '0 0 20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#111827', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 14px' }
const textMuted = { fontSize: '13px', color: '#4B5563', lineHeight: '1.6', margin: '0 0 12px' }
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
  marginTop: '4px',
}
const hr = { borderColor: '#E5E7EB', margin: '32px 0 16px' }
const footer = { padding: '0' }
const footerText = { fontSize: '12px', color: '#6B7280', lineHeight: '1.5', margin: '0 0 4px' }
const footerLink = { color: '#6366F1', textDecoration: 'none' }
const footerHint = { fontSize: '11px', color: '#9CA3AF', lineHeight: '1.5', margin: '8px 0 0', fontStyle: 'italic' as const }
