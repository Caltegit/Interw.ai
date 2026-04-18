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

interface InterviewReportProps {
  candidateName?: string
  candidateEmail?: string
  jobTitle?: string
  projectTitle?: string
  overallScore?: number
  overallGrade?: string | null
  recommendation?: string | null
  executiveSummary?: string
  strengths?: string[]
  areasForImprovement?: string[]
  criteriaScores?: Record<string, CriteriaScore>
  questionEvaluations?: Record<string, QuestionEval>
  reportUrl?: string
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

const InterviewReportEmail = ({
  candidateName = 'Candidat',
  candidateEmail,
  jobTitle = '',
  projectTitle = '',
  overallScore = 0,
  overallGrade,
  recommendation,
  executiveSummary = '',
  strengths = [],
  areasForImprovement = [],
  criteriaScores = {},
  questionEvaluations = {},
  reportUrl = '#',
}: InterviewReportProps) => {
  const criteriaList = Object.values(criteriaScores)
  const questionList = Object.values(questionEvaluations)

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Rapport d'entretien — {candidateName} — Score {overallScore}/100</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Nouveau rapport d'entretien</Heading>
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

          <Section style={scoreBox}>
            <Text style={scoreLabel}>Score global</Text>
            <Text style={scoreValue}>{overallScore}/100{overallGrade ? ` · ${overallGrade}` : ''}</Text>
            <Text style={recoText}>{recommendationLabel(recommendation)}</Text>
          </Section>

          <Button href={reportUrl} style={button}>Voir le rapport complet</Button>

          <Hr style={hr} />

          <Heading as="h2" style={h2}>Résumé exécutif</Heading>
          <Text style={text}>{executiveSummary || '—'}</Text>

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
  displayName: 'Rapport d\'entretien',
  previewData: {
    candidateName: 'Jane Doe',
    candidateEmail: 'jane@example.com',
    jobTitle: 'Développeuse Full-Stack',
    projectTitle: 'Recrutement Q1 2025',
    overallScore: 82,
    overallGrade: 'B',
    recommendation: 'yes',
    executiveSummary: 'Candidate solide avec une excellente communication et une bonne maîtrise technique.',
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
    reportUrl: 'https://interw.ai/sessions/abc',
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
  margin: '16px 0',
  textAlign: 'center' as const,
}
const scoreLabel = { fontSize: '12px', color: '#6b7280', margin: '0', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }
const scoreValue = { fontSize: '28px', fontWeight: 'bold', color: PRIMARY, margin: '4px 0' }
const recoText = { fontSize: '14px', color: '#374151', margin: '4px 0 0' }
const button = {
  backgroundColor: PRIMARY,
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 'bold',
  display: 'inline-block',
  margin: '8px 0 16px',
}
const card = {
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '12px',
  margin: '0 0 8px',
}
const cardTitle = { fontSize: '14px', color: '#111827', margin: '0 0 4px', fontWeight: 'bold' as const }
const cardText = { fontSize: '13px', color: '#4b5563', lineHeight: '1.5', margin: '4px 0 0' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#6b7280', lineHeight: '1.5', margin: '16px 0 0' }
