/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface DemoRequestProps {
  email?: string
  message?: string
}

const DemoRequestEmail = ({ email, message }: DemoRequestProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Nouvelle demande de démo Interw.ai</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nouvelle demande de démo</Heading>
        <Text style={text}>
          Un visiteur du site interw.ai souhaite planifier une démo.
        </Text>
        <Text style={label}>Email du contact :</Text>
        <Text style={value}>{email || '(non fourni)'}</Text>
        {message ? (
          <>
            <Text style={label}>Message :</Text>
            <Text style={value}>{message}</Text>
          </>
        ) : null}
        <Text style={footer}>
          Répondez directement à cet email pour contacter le prospect.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DemoRequestEmail,
  subject: 'Demande de démo',
  to: 'hello@interw.ai',
  displayName: 'Demande de démo (site)',
  previewData: { email: 'prospect@example.com', message: 'Bonjour, je souhaiterais une démo.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.5', margin: '0 0 20px' }
const label = { fontSize: '12px', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.04em', margin: '16px 0 4px' }
const value = { fontSize: '15px', color: '#0f172a', margin: '0 0 8px', lineHeight: '1.5' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '28px 0 0' }
