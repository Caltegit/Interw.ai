import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'interw.ai'
const PRIMARY = '#6366F1'

interface VideoExportReadyProps {
  candidateName?: string
  projectTitle?: string
  downloadUrl?: string
  expiresAt?: string
  fileCount?: number
}

function formatDate(iso?: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

const VideoExportReadyEmail = ({
  candidateName,
  projectTitle,
  downloadUrl,
  expiresAt,
  fileCount,
}: VideoExportReadyProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre archive vidéo est prête à télécharger</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Votre archive vidéo est prête</Heading>

        <Text style={text}>
          L'archive ZIP des réponses vidéo de l'entretien
          {candidateName ? ` de ${candidateName}` : ''}
          {projectTitle ? ` (${projectTitle})` : ''} est disponible.
        </Text>

        {fileCount ? (
          <Text style={text}>
            {fileCount} segment{fileCount > 1 ? 's' : ''} vidéo inclus, accompagnés
            d'un fichier README récapitulatif.
          </Text>
        ) : null}

        <Section style={buttonSection}>
          <Button style={button} href={downloadUrl}>
            Télécharger l'archive
          </Button>
        </Section>

        {expiresAt ? (
          <Text style={infoText}>
            Ce lien expire le {formatDate(expiresAt)}. Pensez à télécharger
            l'archive avant cette date.
          </Text>
        ) : null}

        <Hr style={hr} />

        <Text style={footer}>
          Email automatique de {SITE_NAME}. Ne pas répondre.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: VideoExportReadyEmail,
  subject: (data: Record<string, any>) =>
    data?.candidateName
      ? `Archive vidéo prête — ${data.candidateName}`
      : 'Votre archive vidéo est prête',
  displayName: 'Archive vidéo prête',
  previewData: {
    candidateName: 'Marie Dupont',
    projectTitle: 'Développeur Full-Stack',
    downloadUrl: 'https://example.com/download/abc',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    fileCount: 5,
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
}
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = {
  fontSize: '22px',
  fontWeight: 600,
  color: '#0f172a',
  margin: '0 0 20px',
  lineHeight: '1.3',
}
const text = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const infoText = {
  fontSize: '13px',
  color: '#64748b',
  lineHeight: '1.5',
  margin: '20px 0 0',
}
const buttonSection = { textAlign: 'center' as const, margin: '28px 0 8px' }
const button = {
  backgroundColor: PRIMARY,
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 500,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#e2e8f0', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: 0 }
