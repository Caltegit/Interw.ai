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

interface RecoveryCodeEmailProps {
  siteName: string
  token: string
  expiresInMinutes?: number
}

export const RecoveryCodeEmail = ({
  siteName,
  token,
  expiresInMinutes = 15,
}: RecoveryCodeEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code de connexion {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Votre code de connexion</Heading>
        <Text style={text}>
          Saisissez ce code à 6 chiffres sur {siteName} pour accéder à votre compte.
        </Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={text}>
          Ce code expire dans {expiresInMinutes} minutes et ne peut servir qu’une seule fois.
        </Text>
        <Text style={footer}>
          Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail : votre mot de passe
          reste inchangé.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryCodeEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 20px',
}
const codeStyle = {
  fontSize: '32px',
  fontWeight: 'bold' as const,
  letterSpacing: '8px',
  color: '#000000',
  margin: '0 0 20px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
