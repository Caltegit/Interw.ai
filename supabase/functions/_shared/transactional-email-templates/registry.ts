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

export const TEMPLATES: Record<string, TemplateEntry> = {
  'interview-report': interviewReport,
  'demo-request': demoRequest,
  'email-failure-alert': emailFailureAlert,
}
