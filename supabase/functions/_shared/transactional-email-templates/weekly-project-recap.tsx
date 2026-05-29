import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const PRIMARY = '#6366F1'

interface RecapCandidate {
  name: string
  email: string
  date: string // déjà formatée (ex: "27 mai")
  score?: number | null
  recommendation?: string | null // libellé déjà traduit
  reportUrl: string
}

interface RecapStats {
  totalSessions: number
  weekSessions: number
  averageScore?: number | null
  weekAverageScore?: number | null
  recommendations: {
    strong_yes: number
    yes: number
    maybe: number
    no: number
  }
}

interface WeeklyRecapProps {
  firstName?: string
  jobTitle?: string
  projectUrl?: string
  candidates?: RecapCandidate[]
  stats?: RecapStats
}

const fmtScore = (s?: number | null) =>
  typeof s === 'number' && !isNaN(s) ? `${(Math.round(s * 10) / 10).toFixed(1)}/10` : '—'

const WeeklyProjectRecap = ({
  firstName,
  jobTitle = '',
  projectUrl,
  candidates = [],
  stats,
}: WeeklyRecapProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{`Récap hebdo : ${candidates.length} nouveau(x) candidat(s) sur « ${jobTitle} »`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Récap de la semaine</Heading>
        <Text style={subtitle}>Poste : <strong>{jobTitle}</strong></Text>
        <Text style={text}>
          {firstName ? `Bonjour ${firstName},` : 'Bonjour,'}
        </Text>
        <Text style={text}>
          Voici le récapitulatif des entretiens réalisés sur ce poste durant les 7 derniers jours.
        </Text>

        <Heading as="h2" style={h2}>Nouveaux candidats ({candidates.length})</Heading>
        {candidates.length === 0 ? (
          <Text style={muted}>Aucun nouvel entretien cette semaine.</Text>
        ) : (
          <Section>
            <table style={table} cellPadding={0} cellSpacing={0}>
              <thead>
                <tr>
                  <th style={th}>Candidat</th>
                  <th style={th}>Date</th>
                  <th style={thCenter}>Note IA</th>
                  <th style={th}>Recommandation</th>
                  <th style={th}>Rapport</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr key={i}>
                    <td style={td}>
                      <div style={candidateName}>{c.name}</div>
                      <div style={candidateEmail}>{c.email}</div>
                    </td>
                    <td style={td}>{c.date}</td>
                    <td style={tdCenter}><strong>{fmtScore(c.score)}</strong></td>
                    <td style={td}>{c.recommendation ?? '—'}</td>
                    <td style={td}>
                      <a href={c.reportUrl} style={link}>Voir</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {stats && (
          <>
            <Heading as="h2" style={h2}>Statistiques du projet</Heading>
            <Section style={statsBox}>
              <Text style={statRow}>
                <strong>Sessions complétées :</strong> {stats.totalSessions} au total
                {' · '}
                {stats.weekSessions} cette semaine
              </Text>
              <Text style={statRow}>
                <strong>Note IA moyenne :</strong> {fmtScore(stats.averageScore)} (globale)
                {' · '}
                {fmtScore(stats.weekAverageScore)} (cette semaine)
              </Text>
              <Text style={statRow}>
                <strong>Recommandations :</strong>{' '}
                {stats.recommendations.strong_yes} à recommander fortement,{' '}
                {stats.recommendations.yes} à recommander,{' '}
                {stats.recommendations.maybe} à considérer,{' '}
                {stats.recommendations.no} à écarter
              </Text>
            </Section>
          </>
        )}

        {projectUrl && (
          <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
            <Button href={projectUrl} style={primaryButton}>
              Ouvrir le projet
            </Button>
          </Section>
        )}

        <Hr style={hr} />
        <Text style={footer}>
          Vous recevez ce message car vous êtes destinataire des rapports d'entretien pour ce poste.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WeeklyProjectRecap,
  subject: (data: Record<string, any>) =>
    `Récap interw sur le poste « ${data?.jobTitle ?? ''} »`,
  displayName: 'Récap hebdo projet',
  previewData: {
    firstName: 'Marie',
    jobTitle: 'Product Manager Senior',
    projectUrl: 'https://interw.ai/projects/abc',
    candidates: [
      {
        name: 'Jane Doe',
        email: 'jane@example.com',
        date: '27 mai',
        score: 8.2,
        recommendation: 'À recommander',
        reportUrl: 'https://interw.ai/sessions/abc',
      },
      {
        name: 'John Smith',
        email: 'john@example.com',
        date: '28 mai',
        score: 6.5,
        recommendation: 'À considérer',
        reportUrl: 'https://interw.ai/sessions/def',
      },
    ],
    stats: {
      totalSessions: 24,
      weekSessions: 2,
      averageScore: 7.3,
      weekAverageScore: 7.4,
      recommendations: { strong_yes: 3, yes: 9, maybe: 8, no: 4 },
    },
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '680px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px' }
const h2 = { fontSize: '16px', fontWeight: 'bold', color: '#111827', margin: '24px 0 12px' }
const subtitle = { fontSize: '15px', color: '#374151', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 12px' }
const muted = { fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }
const link = { color: PRIMARY, textDecoration: 'underline' }
const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  margin: '0 0 8px',
  fontSize: '13px',
}
const th = {
  textAlign: 'left' as const,
  padding: '8px 10px',
  borderBottom: '2px solid #e5e7eb',
  color: '#6b7280',
  fontWeight: 600 as const,
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
}
const thCenter = { ...th, textAlign: 'center' as const }
const td = {
  padding: '10px',
  borderBottom: '1px solid #f3f4f6',
  color: '#374151',
  verticalAlign: 'top' as const,
}
const tdCenter = { ...td, textAlign: 'center' as const }
const candidateName = { fontSize: '14px', fontWeight: 600 as const, color: '#111827' }
const candidateEmail = { fontSize: '12px', color: '#6b7280', marginTop: '2px' }
const statsBox = {
  backgroundColor: '#F9FAFB',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '0 0 16px',
}
const statRow = { fontSize: '13px', color: '#374151', margin: '6px 0', lineHeight: '1.5' }
const primaryButton = {
  backgroundColor: PRIMARY,
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 'bold',
  display: 'inline-block',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#6b7280', lineHeight: '1.5', margin: '16px 0 0' }
