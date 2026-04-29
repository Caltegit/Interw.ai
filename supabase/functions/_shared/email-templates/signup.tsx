/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Encore une étape pour activer votre compte Interw.ai</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Bienvenue sur {siteName}</Heading>
        <Text style={text}>Bonjour,</Text>
        <Text style={text}>
          Merci d'avoir créé un compte. Pour finaliser votre inscription et commencer à utiliser
          la plateforme, confirmez votre adresse email en cliquant sur le bouton ci-dessous.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmer mon adresse email
        </Button>
        <Text style={smallText}>
          Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
        </Text>
        <Text style={linkText}>
          <Link href={confirmationUrl} style={link}>
            {confirmationUrl}
          </Link>
        </Text>
        <Text style={footer}>
          Vous n'êtes pas à l'origine de cette inscription ? Ignorez simplement cet email,
          aucun compte ne sera créé.
        </Text>
        <Text style={signature}>
          L'équipe {siteName}
          <br />
          <Link href={siteUrl} style={footerLink}>
            {siteUrl.replace(/^https?:\/\//, '')}
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#111827',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#374151',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const smallText = {
  fontSize: '13px',
  color: '#6b7280',
  lineHeight: '1.5',
  margin: '24px 0 8px',
}
const linkText = {
  fontSize: '13px',
  margin: '0 0 24px',
  wordBreak: 'break-all' as const,
}
const link = { color: '#6366F1', textDecoration: 'underline' }
const button = {
  backgroundColor: '#6366F1',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '8px 0 16px',
}
const footer = {
  fontSize: '13px',
  color: '#6b7280',
  lineHeight: '1.5',
  margin: '24px 0 16px',
}
const signature = {
  fontSize: '13px',
  color: '#374151',
  lineHeight: '1.6',
  margin: '24px 0 0',
  borderTop: '1px solid #e5e7eb',
  paddingTop: '16px',
}
const footerLink = { color: '#6b7280', textDecoration: 'none' }
