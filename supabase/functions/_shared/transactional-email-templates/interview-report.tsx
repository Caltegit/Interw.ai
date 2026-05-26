import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'interw.ai'
const PRIMARY = '#6366F1'

interface CriteriaScore {
  label: string
  score: number
  max: number
  comment?: string
}

interface QuestionEval {
  question: string
  score: number
  comment?: string
}

interface SessionStats {
  duration_seconds?: number
  exchanges_count?: number
  video_answers_count?: number
  best_question_idx?: number
  best_question_score?: number
}

interface PersonalityTrait {
  score?: number
  interpretation?: string
}

interface PersonalityProfile {
  openness?: PersonalityTrait
  conscientiousness?: PersonalityTrait
  extraversion?: PersonalityTrait
  agreeableness?: PersonalityTrait
  emotional_stability?: PersonalityTrait
}

interface FollowupQuestion {
  question: string
  rationale?: string
}

interface RedFlag {
  description?: string
  quote?: string
  severity?: string
}

interface DecisionDriver {
  label?: string
  description?: string
  impact?: string
}

interface SoftSkill {
  label?: string
  score?: number
  comment?: string
}

interface ParaverbalAnalysis {
  status?: string
  profile?: Record<string, { score?: number } | undefined>
  summary?: string | null
}

interface NonverbalAnalysis {
  status?: string
  profile?: Record<string, { score?: number } | undefined>
  summary?: string | null
}

interface InterviewReportProps {
  candidateName?: string
  candidateEmail?: string
  candidateLinkedinUrl?: string | null
  jobTitle?: string
  projectTitle?: string
  overallScore?: number
  overallGrade?: string | null
  recommendation?: string | null
  verdictHeadline?: string | null
  executiveSummary?: string
  executiveSummaryShort?: string | null
  personalityProfile?: PersonalityProfile | null
  followupQuestions?: FollowupQuestion[] | null
  strengths?: string[]
  areasForImprovement?: string[]
  redFlags?: RedFlag[] | null
  decisionDrivers?: DecisionDriver[] | null
  softSkills?: SoftSkill[] | null
  criteriaScores?: Record<string, CriteriaScore>
  questionEvaluations?: Record<string, QuestionEval>
  paraverbalAnalysis?: ParaverbalAnalysis | null
  nonverbalAnalysis?: NonverbalAnalysis | null
  reportUrl?: string
  stats?: SessionStats
}

const BIG_FIVE_LABELS: Record<keyof PersonalityProfile, string> = {
  openness: 'Ouverture',
  conscientiousness: 'Rigueur',
  extraversion: 'Extraversion',
  agreeableness: 'Coopération',
  emotional_stability: 'Stabilité émotionnelle',
}

const recommendationLabel = (r?: string | null) => {
  switch (r) {
    case 'strong_yes': return '✅ Fortement recommandé'
    case 'yes': return '👍 Recommandé'
    case 'maybe': return '🤔 À considérer'
    case 'no': return '❌ Non recommandé'
    default: return '—'
  }
}

const formatDuration = (s?: number) => {
  if (!s || s <= 0) return '—'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m} min ${sec.toString().padStart(2, '0')} s`
}

const InterviewReportEmail = ({
  candidateName = 'Candidat',
  candidateEmail,
  candidateLinkedinUrl = null,
  jobTitle = '',
  projectTitle = '',
  overallScore = 0,
  overallGrade,
  recommendation,
  verdictHeadline = null,
  executiveSummary = '',
  executiveSummaryShort = null,
  personalityProfile = null,
  followupQuestions = null,
  strengths = [],
  areasForImprovement = [],
  redFlags = null,
  decisionDrivers = null,
  softSkills = null,
  criteriaScores = {},
  questionEvaluations = {},
  reportUrl = '#',
  stats = {},
}: InterviewReportProps) => {
  const criteriaList = Object.values(criteriaScores)
  const questionList = Object.values(questionEvaluations)
  const personalityEntries = personalityProfile
    ? (Object.keys(BIG_FIVE_LABELS) as Array<keyof PersonalityProfile>)
        .map((k) => ({ key: k, label: BIG_FIVE_LABELS[k], trait: personalityProfile[k] }))
        .filter((e) => e.trait && typeof e.trait.score === 'number')
    : []

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>{`Rapport de session — ${candidateName} — Score ${overallScore}/100`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Nouveau rapport de session</Heading>
          <Text style={subtitle}>
            <strong>{candidateName}</strong>
            {jobTitle ? <> — {jobTitle}</> : null}
            {projectTitle ? <><br /><span style={muted}>{projectTitle}</span></> : null}
          </Text>

          {candidateEmail ? (
            <Text style={muted}>
              Email candidat : <a href={`mailto:${candidateEmail}`} style={link}>{candidateEmail}</a>
            </Text>
          ) : null}

          {candidateLinkedinUrl ? (
            <Text style={muted}>
              LinkedIn : <a href={candidateLinkedinUrl} style={link}>{candidateLinkedinUrl}</a>
            </Text>
          ) : null}

          <Section style={scoreBox}>
            <Text style={scoreLabel}>Score global</Text>
            <Text style={scoreValue}>{overallScore}/100{overallGrade ? ` · ${overallGrade}` : ''}</Text>
            <Text style={recoText}>{recommendationLabel(recommendation)}</Text>
          </Section>

          {verdictHeadline ? (
            <Section style={shortSummaryBox}>
              <Text style={shortSummaryLabel}>🎯 Verdict</Text>
              <Text style={shortSummaryText}>{verdictHeadline}</Text>
            </Section>
          ) : executiveSummaryShort ? (
            <Section style={shortSummaryBox}>
              <Text style={shortSummaryLabel}>🎯 Résumé en 30 secondes</Text>
              <Text style={shortSummaryText}>{executiveSummaryShort}</Text>
            </Section>
          ) : null}

          <Section style={statsBox}>
            <Text style={statRow}>
              <strong>⏱ Durée :</strong> {formatDuration(stats.duration_seconds)}
            </Text>
            <Text style={statRow}>
              <strong>💬 Échanges :</strong> {stats.exchanges_count ?? 0}
              {' · '}
              <strong>🎥 Réponses vidéo :</strong> {stats.video_answers_count ?? 0}
            </Text>
            {typeof stats.best_question_idx === 'number' && stats.best_question_score ? (
              <Text style={statRow}>
                <strong>🏆 Meilleur moment :</strong> Question {stats.best_question_idx + 1} (score {stats.best_question_score}/10)
              </Text>
            ) : null}
          </Section>

          <Button href={reportUrl} style={primaryButton}>Voir le rapport complet</Button>

          <Hr style={hr} />

          <Heading as="h2" style={h2}>Résumé exécutif</Heading>
          <Text style={text}>{executiveSummary || '—'}</Text>

          {decisionDrivers && decisionDrivers.length > 0 && (
            <>
              <Heading as="h2" style={h2}>🧭 Facteurs de décision</Heading>
              {decisionDrivers.map((d, i) => (
                <Section key={i} style={card}>
                  <Text style={cardTitle}>
                    {d.label || `Facteur ${i + 1}`}
                    {d.impact ? <span style={muted}> · {d.impact}</span> : null}
                  </Text>
                  {d.description ? <Text style={cardText}>{d.description}</Text> : null}
                </Section>
              ))}
            </>
          )}

          {strengths.length > 0 && (
            <>
              <Heading as="h2" style={h2}>Points forts</Heading>
              {strengths.map((s, i) => (
                <Text key={i} style={listItem}>• {s}</Text>
              ))}
            </>
          )}

          {areasForImprovement.length > 0 && (
            <>
              <Heading as="h2" style={h2}>Axes d'amélioration</Heading>
              {areasForImprovement.map((s, i) => (
                <Text key={i} style={listItem}>• {s}</Text>
              ))}
            </>
          )}

          {redFlags && redFlags.length > 0 && (
            <>
              <Heading as="h2" style={h2}>🚩 Points de vigilance</Heading>
              {redFlags.map((rf, i) => (
                <Section key={i} style={redFlagCard}>
                  <Text style={cardTitle}>
                    {rf.description || `Vigilance ${i + 1}`}
                    {rf.severity ? <span style={muted}> · {rf.severity}</span> : null}
                  </Text>
                  {rf.quote ? <Text style={cardText}><em>« {rf.quote} »</em></Text> : null}
                </Section>
              ))}
            </>
          )}

          {softSkills && softSkills.length > 0 && (
            <>
              <Heading as="h2" style={h2}>🤝 Compétences comportementales</Heading>
              {softSkills.map((s, i) => (
                <Section key={i} style={card}>
                  <Text style={cardTitle}>
                    {s.label || `Compétence ${i + 1}`}
                    {typeof s.score === 'number' ? <> — <strong>{s.score}/10</strong></> : null}
                  </Text>
                  {s.comment ? <Text style={cardText}>{s.comment}</Text> : null}
                </Section>
              ))}
            </>
          )}


          {personalityEntries.length > 0 && (
            <>
              <Heading as="h2" style={h2}>🧠 Profil de personnalité (Big Five)</Heading>
              {personalityEntries.map(({ key, label, trait }) => {
                const score = Math.max(0, Math.min(100, trait!.score!))
                return (
                  <Section key={key} style={traitRow}>
                    <Text style={traitLabel}><strong>{label}</strong> — {score}/100</Text>
                    <div style={{ ...barTrack, marginTop: '4px' }}>
                      <div style={{ ...barFill, width: `${score}%` }} />
                    </div>
                    {trait!.interpretation ? (
                      <Text style={traitText}>{trait!.interpretation}</Text>
                    ) : null}
                  </Section>
                )
              })}
            </>
          )}

          {followupQuestions && followupQuestions.length > 0 && (
            <>
              <Heading as="h2" style={h2}>❓ Questions à creuser en entretien</Heading>
              {followupQuestions.map((q, i) => (
                <Section key={i} style={card}>
                  <Text style={cardTitle}>{i + 1}. {q.question}</Text>
                  {q.rationale ? <Text style={cardText}>{q.rationale}</Text> : null}
                </Section>
              ))}
            </>
          )}

          {criteriaList.length > 0 && (
            <>
              <Heading as="h2" style={h2}>Évaluation par critère</Heading>
              {criteriaList.map((c, i) => (
                <Section key={i} style={card}>
                  <Text style={cardTitle}>{c.label} — <strong>{c.score}/{c.max}</strong></Text>
                  {c.comment ? <Text style={cardText}>{c.comment}</Text> : null}
                </Section>
              ))}
            </>
          )}

          {questionList.length > 0 && (
            <>
              <Heading as="h2" style={h2}>Évaluation par question</Heading>
              {questionList.map((q, i) => (
                <Section key={i} style={card}>
                  <Text style={cardTitle}>Q{i + 1} — Score {q.score}/10</Text>
                  <Text style={cardText}><em>{q.question}</em></Text>
                  {q.comment ? <Text style={cardText}>{q.comment}</Text> : null}
                </Section>
              ))}
            </>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            Vous pouvez répondre directement à cet email pour contacter le candidat.
            <br />
            Envoyé par {SITE_NAME}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: InterviewReportEmail,
  subject: (data: Record<string, any>) => `interw.ai - ${data?.candidateName ?? 'Candidat'}`,
  displayName: 'Rapport de session',
  previewData: {
    candidateName: 'Jane Doe',
    candidateEmail: 'jane@example.com',
    jobTitle: 'Développeuse Full-Stack',
    projectTitle: 'Recrutement Q1 2025',
    overallScore: 82,
    overallGrade: 'B',
    recommendation: 'yes',
    executiveSummary: 'Candidate solide avec une excellente communication et une bonne maîtrise technique.',
    executiveSummaryShort: 'Profil solide à rencontrer en priorité : communication excellente, vraie motivation, à valider sur le test technique.',
    personalityProfile: {
      openness: { score: 78, interpretation: 'Curiosité marquée, apprécie les sujets nouveaux.' },
      conscientiousness: { score: 82, interpretation: 'Très structurée dans ses réponses.' },
      extraversion: { score: 65, interpretation: 'À l\'aise à l\'oral sans être démonstrative.' },
      agreeableness: { score: 70, interpretation: 'Coopérative, oriente ses exemples sur le collectif.' },
      emotional_stability: { score: 75, interpretation: 'Reste posée sur les questions difficiles.' },
    },
    followupQuestions: [
      { question: 'Pouvez-vous détailler votre approche des tests sur votre dernier projet React ?', rationale: 'À creuser car peu d\'exemples concrets.' },
      { question: 'Comment gérez-vous un désaccord technique avec un lead ?', rationale: 'Valider la posture en équipe.' },
    ],
    strengths: ['Communication claire', 'Solide expérience React', 'Bonne motivation'],
    areasForImprovement: ['Approfondir la connaissance des tests', 'Plus de détails sur la gestion d\'état'],
    criteriaScores: {
      a: { label: 'Communication', score: 8, max: 10, comment: 'Très claire et structurée.' },
      b: { label: 'Compétences techniques', score: 7, max: 10, comment: 'Bonne base, à confirmer en pratique.' },
    },
    questionEvaluations: {
      '0': { question: 'Présentez-vous', score: 9, comment: 'Présentation très structurée.' },
      '1': { question: 'Pourquoi notre entreprise ?', score: 7, comment: 'Motivation correcte mais générique.' },
    },
    stats: {
      duration_seconds: 754,
      exchanges_count: 18,
      video_answers_count: 5,
      best_question_idx: 0,
      best_question_score: 9,
    },
    reportUrl: 'https://interw.ai/sessions/abc',
    candidateLinkedinUrl: 'https://www.linkedin.com/in/jane-doe',
    verdictHeadline: 'Profil solide à rencontrer en priorité.',
    decisionDrivers: [
      { label: 'Communication', description: 'Discours clair et structuré tout au long de l\'entretien.', impact: 'Positif' },
      { label: 'Expérience produit', description: 'Manque d\'exemples concrets sur le scope produit attendu.', impact: 'À valider' },
    ],
    redFlags: [
      { description: 'Manque de précision sur la gestion d\'équipe', severity: 'Modéré', quote: 'Je n\'ai pas eu de management direct dans mon dernier poste.' },
    ],
    softSkills: [
      { label: 'Esprit d\'équipe', score: 8, comment: 'Mentionne plusieurs collaborations réussies.' },
      { label: 'Autonomie', score: 7, comment: 'A piloté plusieurs projets en parallèle.' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '640px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px' }
const h2 = { fontSize: '16px', fontWeight: 'bold', color: '#111827', margin: '24px 0 8px' }
const subtitle = { fontSize: '15px', color: '#374151', margin: '0 0 4px' }
const muted = { fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 12px' }
const listItem = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 6px' }
const link = { color: PRIMARY, textDecoration: 'underline' }
const scoreBox = {
  backgroundColor: '#EEF2FF',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0 8px',
  textAlign: 'center' as const,
}
const statsBox = {
  backgroundColor: '#F9FAFB',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '0 0 16px',
}
const statRow = { fontSize: '13px', color: '#374151', margin: '4px 0', lineHeight: '1.5' }
const scoreLabel = { fontSize: '12px', color: '#6b7280', margin: '0', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }
const scoreValue = { fontSize: '28px', fontWeight: 'bold', color: PRIMARY, margin: '4px 0' }
const recoText = { fontSize: '14px', color: '#374151', margin: '4px 0 0' }
const primaryButton = {
  backgroundColor: PRIMARY,
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 'bold',
  display: 'inline-block',
  margin: '0 8px 8px 0',
}
const secondaryButton = {
  backgroundColor: '#ffffff',
  color: PRIMARY,
  padding: '11px 23px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 'bold',
  display: 'inline-block',
  margin: '0 0 16px',
  border: `1px solid ${PRIMARY}`,
}
const card = {
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '12px',
  margin: '0 0 8px',
}
const redFlagCard = {
  border: '1px solid #FECACA',
  backgroundColor: '#FEF2F2',
  borderRadius: '6px',
  padding: '12px',
  margin: '0 0 8px',
}
const cardTitle = { fontSize: '14px', color: '#111827', margin: '0 0 4px', fontWeight: 'bold' as const }
const cardText = { fontSize: '13px', color: '#4b5563', lineHeight: '1.5', margin: '4px 0 0' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#6b7280', lineHeight: '1.5', margin: '16px 0 0' }
const shortSummaryBox = {
  backgroundColor: '#FEF3C7',
  borderLeft: `4px solid ${PRIMARY}`,
  borderRadius: '6px',
  padding: '12px 16px',
  margin: '0 0 16px',
}
const shortSummaryLabel = { fontSize: '12px', fontWeight: 'bold' as const, color: PRIMARY, margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }
const shortSummaryText = { fontSize: '15px', color: '#111827', margin: '0', lineHeight: '1.5', fontWeight: 500 as const }
const traitRow = { margin: '0 0 12px', padding: '0' }
const traitLabel = { fontSize: '13px', color: '#374151', margin: '0' }
const traitText = { fontSize: '12px', color: '#6b7280', margin: '4px 0 0', lineHeight: '1.5' }
const barTrack = { backgroundColor: '#E5E7EB', borderRadius: '4px', height: '6px', width: '100%', overflow: 'hidden' as const }
const barFill = { backgroundColor: PRIMARY, height: '6px', borderRadius: '4px' }
