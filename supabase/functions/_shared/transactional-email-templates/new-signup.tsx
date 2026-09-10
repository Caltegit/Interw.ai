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

interface NewSignupProps {
  email?: string
  fullName?: string
  signedUpAt?: string
}

const NewSignupEmail = ({ email, fullName, signedUpAt }: NewSignupProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Nouvelle inscription Interw</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nouvelle inscription</Heading>
        <Text style={text}>
          Une personne vient de créer un compte depuis le site Interw.
        </Text>
        <Text style={label}>Nom</Text>
        <Text style={value}>{fullName || '(non fourni)'}</Text>
        <Text style={label}>Adresse e-mail</Text>
        <Text style={value}>{email || '(non fournie)'}</Text>
        <Text style={label}>Date</Text>
        <Text style={value}>{signedUpAt || '(inconnue)'}</Text>
        <Text style={footer}>
          Le compte reste en attente de confirmation de l'adresse e-mail.
          Répondez à ce message pour écrire directement à la personne inscrite.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewSignupEmail,
  subject: 'Nouvelle inscription Interw',
  to: 'eva@interw.com',
  displayName: 'Nouvelle inscription (site)',
  previewData: {
    email: 'nouvelle.personne@example.com',
    fullName: 'Camille Martin',
    signedUpAt: '10 septembre 2026 à 11:48',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.5', margin: '0 0 20px' }
const label = { fontSize: '12px', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.04em', margin: '16px 0 4px' }
const value = { fontSize: '15px', color: '#0f172a', margin: '0 0 8px', lineHeight: '1.5' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '28px 0 0' }
