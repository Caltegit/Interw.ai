/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  token?: string
}

export const RecoveryEmail = ({
  siteName,
  token,
}: RecoveryEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code de réinitialisation {siteName} — valable 1 heure.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Réinitialisation de votre mot de passe</Heading>
        <Text style={text}>Bonjour,</Text>
        <Text style={text}>
          Nous avons reçu une demande de réinitialisation du mot de passe associé à
          votre compte {siteName}. Saisissez le code ci-dessous dans la page ouverte
          sur votre navigateur pour choisir un nouveau mot de passe.
        </Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={smallText}>
          Ce code est valable 1 heure et à usage unique.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Si vous n'êtes pas à l'origine de cette demande, ignorez cet email —
          votre mot de passe actuel restera inchangé.
          <br /><br />
          Pour votre sécurité, notre équipe ne vous demandera jamais votre mot de passe
          ni votre code par email ou téléphone.
          <br /><br />
          L'équipe {siteName}
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#6366F1',
  margin: '0 0 24px',
}
const text = {
  fontSize: '15px',
  color: '#374151',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '34px',
  fontWeight: 'bold' as const,
  color: '#6366F1',
  letterSpacing: '8px',
  textAlign: 'center' as const,
  margin: '24px 0 12px',
}
const smallText = {
  fontSize: '13px',
  color: '#6b7280',
  lineHeight: '1.5',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#6b7280', margin: '0', lineHeight: '1.6' }
