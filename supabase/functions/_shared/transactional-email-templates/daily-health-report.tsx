import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const PRIMARY = '#6366F1'

type Severity = 'ok' | 'warn' | 'alert'

interface Counters {
  sessionsStarted: number
  sessionsCompleted: number
  sessionsAbandoned: number
  reportsOk: number
  reportsFailed: number
  transcriptsOk: number
  transcriptsFailed: number
  transcriptsLowConfidence: number
  edgeErrors: number
  newFeedbacks: number
  commits: number
}

interface FnStat {
  name: string
  invocations: number
  errors: number
  p95Ms: number | null
}

interface AnomalySession {
  id: string
  candidate: string
  reason: string
  url: string
}

interface Commit {
  sha: string
  message: string
  author: string
  url: string
  sensitive: boolean
}

interface FeedbackItem {
  subject: string
  status: string
  lastMessageAt: string
}

interface Props {
  periodLabel: string
  severity: Severity
  counters: Counters
  fnStats: FnStat[]
  topErrors: { fn: string; message: string; count: number }[]
  anomalies: AnomalySession[]
  feedbacks: FeedbackItem[]
  commits: Commit[] | null // null = GitHub non connecté
  emailAlerts: { at: string; failureCount: number }[]
  purges: { at: string; source: string; count: number }[]
}

const SEV_COLOR: Record<Severity, string> = {
  ok: '#10B981',
  warn: '#F59E0B',
  alert: '#EF4444',
}
const SEV_LABEL: Record<Severity, string> = {
  ok: 'OK',
  warn: 'À surveiller',
  alert: 'Alerte',
}

const DailyHealthReport = ({
  periodLabel,
  severity,
  counters,
  fnStats,
  topErrors,
  anomalies,
  feedbacks,
  commits,
  emailAlerts,
  purges,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{`Rapport santé Interw — ${periodLabel} — ${SEV_LABEL[severity]}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={{ ...badge, backgroundColor: SEV_COLOR[severity] }}>
          {SEV_LABEL[severity]}
        </div>
        <Heading style={h1}>Rapport santé produit</Heading>
        <Text style={subtitle}>Période : {periodLabel}</Text>

        <Heading as="h2" style={h2}>Résumé</Heading>
        <Section style={box}>
          <Row label="Sessions démarrées" value={counters.sessionsStarted} />
          <Row label="Sessions terminées" value={counters.sessionsCompleted} />
          <Row label="Sessions abandonnées" value={counters.sessionsAbandoned} />
          <Row label="Rapports OK" value={counters.reportsOk} />
          <Row label="Rapports en erreur" value={counters.reportsFailed} warn={counters.reportsFailed > 0} />
          <Row label="Transcriptions OK" value={counters.transcriptsOk} />
          <Row label="Transcriptions échouées" value={counters.transcriptsFailed} warn={counters.transcriptsFailed > 0} />
          <Row label="Transcriptions faible confiance" value={counters.transcriptsLowConfidence} warn={counters.transcriptsLowConfidence > 0} />
          <Row label="Erreurs edge functions" value={counters.edgeErrors} warn={counters.edgeErrors > 0} />
          <Row label="Nouveaux feedbacks" value={counters.newFeedbacks} />
          <Row label="Commits GitHub" value={commits === null ? '—' : counters.commits} />
        </Section>

        <Heading as="h2" style={h2}>Edge functions</Heading>
        {fnStats.length === 0 ? (
          <Text style={muted}>Aucune activité edge function sur la période.</Text>
        ) : (
          <table style={table} cellPadding={0} cellSpacing={0}>
            <thead>
              <tr>
                <th style={th}>Fonction</th>
                <th style={thCenter}>Invocations</th>
                <th style={thCenter}>Erreurs</th>
                <th style={thCenter}>P95 (ms)</th>
              </tr>
            </thead>
            <tbody>
              {fnStats.map((f) => (
                <tr key={f.name}>
                  <td style={td}>{f.name}</td>
                  <td style={tdCenter}>{f.invocations}</td>
                  <td style={{ ...tdCenter, color: f.errors > 0 ? '#EF4444' : '#374151', fontWeight: f.errors > 0 ? 700 : 400 }}>{f.errors}</td>
                  <td style={tdCenter}>{f.p95Ms ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {topErrors.length > 0 && (
          <>
            <Heading as="h3" style={h3}>Top erreurs</Heading>
            <Section style={box}>
              {topErrors.map((e, i) => (
                <Text key={i} style={statRow}>
                  <strong>{e.fn}</strong> ×{e.count} — <code style={code}>{truncate(e.message, 240)}</code>
                </Text>
              ))}
            </Section>
          </>
        )}

        <Heading as="h2" style={h2}>Sessions anormales</Heading>
        {anomalies.length === 0 ? (
          <Text style={muted}>Aucune session anormale sur la période. ✅</Text>
        ) : (
          <Section style={box}>
            {anomalies.slice(0, 30).map((s) => (
              <Text key={s.id} style={statRow}>
                <a href={s.url} style={link}>{s.candidate}</a> — {s.reason}
              </Text>
            ))}
            {anomalies.length > 30 && (
              <Text style={muted}>… et {anomalies.length - 30} autres.</Text>
            )}
          </Section>
        )}

        <Heading as="h2" style={h2}>Feedbacks utilisateurs</Heading>
        {feedbacks.length === 0 ? (
          <Text style={muted}>Aucun nouveau feedback sur la période.</Text>
        ) : (
          <Section style={box}>
            {feedbacks.map((f, i) => (
              <Text key={i} style={statRow}>
                <strong>[{f.status}]</strong> {f.subject} — <span style={{ color: '#6b7280' }}>{f.lastMessageAt}</span>
              </Text>
            ))}
          </Section>
        )}

        <Heading as="h2" style={h2}>Commits & risque de régression</Heading>
        {commits === null ? (
          <Text style={muted}>
            GitHub non connecté. Pour activer cette section, connecte GitHub via le menu <strong>+</strong> du chat Lovable → GitHub.
          </Text>
        ) : commits.length === 0 ? (
          <Text style={muted}>Aucun commit sur la période.</Text>
        ) : (
          <Section style={box}>
            {commits.map((c) => (
              <Text key={c.sha} style={statRow}>
                {c.sensitive && <span style={sensitive}>ZONE SENSIBLE</span>}
                <a href={c.url} style={link}>{c.sha.slice(0, 7)}</a> — {truncate(c.message, 120)}
                <span style={{ color: '#6b7280' }}> ({c.author})</span>
              </Text>
            ))}
          </Section>
        )}

        {(emailAlerts.length > 0 || purges.length > 0) && (
          <>
            <Heading as="h2" style={h2}>Emails & purges</Heading>
            <Section style={box}>
              {emailAlerts.map((e, i) => (
                <Text key={`e${i}`} style={statRow}>
                  Alerte email — {e.failureCount} échecs à {e.at}
                </Text>
              ))}
              {purges.map((p, i) => (
                <Text key={`p${i}`} style={statRow}>
                  Purge {p.source} — {p.count} éléments à {p.at}
                </Text>
              ))}
            </Section>
          </>
        )}

        <Hr style={hr} />
        <Text style={footer}>
          Rapport automatique envoyé quotidiennement à 7h (Europe/Paris).
        </Text>
      </Container>
    </Body>
  </Html>
)

const Row = ({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) => (
  <Text style={statRow}>
    <strong>{label} :</strong>{' '}
    <span style={{ color: warn ? '#EF4444' : '#111827', fontWeight: warn ? 700 : 500 }}>{value}</span>
  </Text>
)

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s)

export const template = {
  component: DailyHealthReport,
  subject: (data: Record<string, any>) => {
    const sev = (data?.severity as Severity) ?? 'ok'
    const prefix = sev === 'alert' ? '🔴' : sev === 'warn' ? '🟠' : '🟢'
    return `${prefix} Rapport santé Interw — ${data?.periodLabel ?? ''}`
  },
  displayName: 'Rapport santé produit (quotidien)',
  previewData: {
    periodLabel: '18–19 juillet 2026',
    severity: 'warn' as Severity,
    counters: {
      sessionsStarted: 12,
      sessionsCompleted: 9,
      sessionsAbandoned: 2,
      reportsOk: 9,
      reportsFailed: 1,
      transcriptsOk: 87,
      transcriptsFailed: 2,
      transcriptsLowConfidence: 3,
      edgeErrors: 4,
      newFeedbacks: 1,
      commits: 6,
    },
    fnStats: [
      { name: 'generate-report', invocations: 12, errors: 1, p95Ms: 8400 },
      { name: 'transcribe-session', invocations: 87, errors: 2, p95Ms: 5300 },
    ],
    topErrors: [
      { fn: 'generate-report', message: 'Gateway 429 rate limit', count: 3 },
    ],
    anomalies: [
      { id: 'abc', candidate: 'Jane Doe', reason: 'report_job failed: gemini timeout', url: 'https://interw.com/sessions/abc' },
    ],
    feedbacks: [
      { subject: 'Vidéo saccadée', status: 'open', lastMessageAt: 'il y a 3h' },
    ],
    commits: [
      { sha: 'abc1234def', message: 'fix(matrix): fix off-by-one indexing', author: 'eva', url: '#', sensitive: true },
    ],
    emailAlerts: [],
    purges: [],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '720px', margin: '0 auto' }
const badge = {
  display: 'inline-block',
  padding: '4px 12px',
  borderRadius: '999px',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
  marginBottom: '12px',
}
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#111827', margin: '0 0 4px' }
const h2 = { fontSize: '16px', fontWeight: 'bold', color: '#111827', margin: '24px 0 10px' }
const h3 = { fontSize: '14px', fontWeight: 'bold', color: '#111827', margin: '14px 0 6px' }
const subtitle = { fontSize: '13px', color: '#6b7280', margin: '0 0 8px' }
const muted = { fontSize: '13px', color: '#6b7280', margin: '0 0 8px' }
const link = { color: PRIMARY, textDecoration: 'underline' }
const table = { width: '100%', borderCollapse: 'collapse' as const, margin: '0 0 8px', fontSize: '13px' }
const th = {
  textAlign: 'left' as const, padding: '8px 10px', borderBottom: '2px solid #e5e7eb',
  color: '#6b7280', fontWeight: 600 as const, fontSize: '11px',
  textTransform: 'uppercase' as const, letterSpacing: '0.04em',
}
const thCenter = { ...th, textAlign: 'center' as const }
const td = { padding: '8px 10px', borderBottom: '1px solid #f3f4f6', color: '#374151' }
const tdCenter = { ...td, textAlign: 'center' as const }
const box = { backgroundColor: '#F9FAFB', borderRadius: '8px', padding: '12px 16px', margin: '0 0 12px' }
const statRow = { fontSize: '13px', color: '#374151', margin: '4px 0', lineHeight: '1.5' }
const code = { fontFamily: 'monospace', fontSize: '12px', color: '#111827', backgroundColor: '#F3F4F6', padding: '1px 4px', borderRadius: '3px' }
const sensitive = {
  display: 'inline-block', backgroundColor: '#FEE2E2', color: '#B91C1C',
  fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '3px',
  marginRight: '6px', letterSpacing: '0.03em',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#6b7280', lineHeight: '1.5', margin: '16px 0 0' }
