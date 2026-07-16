/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as interviewReport } from './interview-report.tsx'
import { template as demoRequest } from './demo-request.tsx'
import { template as emailFailureAlert } from './email-failure-alert.tsx'
import { template as interviewIssueReport } from './interview-issue-report.tsx'
import { template as bulkCandidateMessage } from './bulk-candidate-message.tsx'
import { template as candidateThankYou } from './candidate-thank-you.tsx'
import { template as weeklyProjectRecap } from './weekly-project-recap.tsx'
import { template as candidateAbandonReminder } from './candidate-abandon-reminder.tsx'
import { template as feedbackCopy } from './feedback-copy.tsx'
import { template as organizationInvite } from './organization-invite.tsx'
import { template as candidateRecoveryInvite } from './candidate-recovery-invite.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'candidate-recovery-invite': candidateRecoveryInvite,
  'interview-report': interviewReport,
  'demo-request': demoRequest,
  'email-failure-alert': emailFailureAlert,
  'interview-issue-report': interviewIssueReport,
  'bulk-candidate-message': bulkCandidateMessage,
  'candidate-thank-you': candidateThankYou,
  'weekly-project-recap': weeklyProjectRecap,
  'candidate-abandon-reminder': candidateAbandonReminder,
  'feedback-copy': feedbackCopy,
  'organization-invite': organizationInvite,
}

