/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Cliquez pour vous reconnecter à {siteName} — lien valable 1 heure.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Votre lien de connexion</Heading>
        <Text style={text}>
          Bonjour,
        </Text>
        <Text style={text}>
          Vous avez demandé un lien de connexion pour accéder à votre compte {siteName}.
          Cliquez sur le bouton ci-dessous pour vous connecter automatiquement, sans
          avoir à saisir de mot de passe.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Me connecter à {siteName}
        </Button>
        <Text style={smallText}>
          Une page de confirmation s'ouvrira ; cliquez sur « Me connecter » pour finaliser.
        </Text>
        <Text style={smallText}>
          Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :
        </Text>
        <Text style={linkText}>
          <Link href={confirmationUrl} style={linkStyle}>{confirmationUrl}</Link>
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Ce lien est <strong>valable 1 heure</strong> et ne peut être utilisé qu'une seule fois.
          <br /><br />
          Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email
          en toute sécurité — personne ne pourra accéder à votre compte sans ce lien.
          <br /><br />
          Pour votre sécurité, notre équipe ne vous demandera jamais votre mot de passe
          par email.
          <br /><br />
          L'équipe {siteName}
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

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
const smallText = {
  fontSize: '13px',
  color: '#6b7280',
  lineHeight: '1.5',
  margin: '24px 0 8px',
}
const linkText = {
  fontSize: '13px',
  color: '#6366F1',
  lineHeight: '1.4',
  margin: '0 0 16px',
  wordBreak: 'break-all' as const,
}
const linkStyle = { color: '#6366F1', textDecoration: 'underline' }
const button = {
  backgroundColor: '#6366F1',
  color: '#ffffff',
  fontSize: '15px',
  borderRadius: '8px',
  padding: '14px 24px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '8px 0 16px',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#6b7280', margin: '0', lineHeight: '1.6' }
