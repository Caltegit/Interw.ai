/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

// Register transactional email templates here as you create them.
// Example:
// import { template as welcome } from './welcome.tsx'
// export const TEMPLATES: Record<string, TemplateEntry> = { 'welcome': welcome }

export const TEMPLATES: Record<string, TemplateEntry> = {}
