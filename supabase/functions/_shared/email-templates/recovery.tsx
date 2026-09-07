/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => {
  if (!confirmationUrl) {
    throw new Error('RecoveryEmail requires confirmationUrl')
  }
  return (
    <Html lang="fr" dir="ltr">
      <Head>
        <style>{darkModeCss}</style>
      </Head>
      <Preview>Réinitialisez votre mot de passe {siteName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Réinitialisez votre mot de passe</Heading>
          <Text style={text}>
            Nous avons reçu une demande de réinitialisation de votre mot de passe {siteName}.
            Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
          </Text>
          <Button className="dm-btn" style={button} href={confirmationUrl}>
            Choisir un nouveau mot de passe
          </Button>
          <Text style={footer}>
            Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail : votre mot de passe
            reste inchangé.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default RecoveryEmail

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
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #000000',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  }
  [data-ogsc] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  [data-ogsb] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
`
