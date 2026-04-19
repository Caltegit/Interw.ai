import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'InterwAI'

interface EmailFailureAlertProps {
  failureCount?: number
  threshold?: number
  windowMinutes?: number
  dashboardUrl?: string
}

const EmailFailureAlert = ({
  failureCount = 0,
  threshold = 5,
  windowMinutes = 60,
  dashboardUrl = 'https://interw.ai/admin/emails',
}: EmailFailureAlertProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{`Alerte: ${failureCount} échecs d'envoi d'emails détectés`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>⚠️ Alerte envoi d'emails</Heading>
        <Text style={text}>
          Le système a détecté <strong>{failureCount} échecs d'envoi</strong> d'emails sur la dernière {windowMinutes >= 60 ? 'heure' : `tranche de ${windowMinutes} minutes`}, ce qui dépasse le seuil configuré ({threshold}).
        </Text>
        <Section style={alertBox}>
          <Text style={alertText}>
            Échecs détectés : <strong>{failureCount}</strong><br />
            Seuil : <strong>{threshold}</strong><br />
            Fenêtre : <strong>{windowMinutes} minutes</strong>
          </Text>
        </Section>
        <Text style={text}>
          Vérifiez le tableau de bord pour identifier les destinataires concernés et la cause des échecs (rate-limit, adresses invalides, configuration provider, etc.).
        </Text>
        <Section style={{ textAlign: 'center', margin: '30px 0' }}>
          <Button href={dashboardUrl} style={button}>
            Voir le tableau de bord
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          Cette alerte est envoyée automatiquement par {SITE_NAME}. Pas de nouvelle alerte ne sera envoyée pendant les prochaines heures (cooldown anti-spam).
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EmailFailureAlert,
  subject: (data: Record<string, any>) =>
    `⚠️ ${data?.failureCount ?? 0} échecs d'envoi d'emails détectés sur ${SITE_NAME}`,
  displayName: 'Alerte échecs envoi emails',
  previewData: { failureCount: 12, threshold: 5, windowMinutes: 60, dashboardUrl: 'https://interw.ai/admin/emails' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '600px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const alertBox = { backgroundColor: '#fef3c7', borderLeft: '4px solid #f59e0b', padding: '16px 20px', borderRadius: '6px', margin: '20px 0' }
const alertText = { fontSize: '14px', color: '#78350f', lineHeight: '1.8', margin: 0 }
const button = { backgroundColor: '#6366F1', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'inline-block' }
const hr = { border: 'none', borderTop: '1px solid #e2e8f0', margin: '30px 0 20px' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: 0 }
