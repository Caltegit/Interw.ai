import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Interw'
const PRIMARY = '#6366F1'

interface Props {
  inviterName?: string
  organizationName?: string
  inviteUrl?: string
  recipientEmail?: string
}

const OrganizationInviteEmail = ({
  inviterName = 'Un recruteur',
  organizationName = 'une organisation',
  inviteUrl = 'https://interw.com',
  recipientEmail = '',
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{`${inviterName} vous invite à rejoindre ${organizationName} sur ${SITE_NAME}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Vous êtes invité sur {SITE_NAME}</Heading>

        <Text style={text}>
          <strong>{inviterName}</strong> vous invite à rejoindre l'organisation{' '}
          <strong>{organizationName}</strong>.
        </Text>

        <Text style={text}>
          Pour accepter l'invitation, créez votre compte en cliquant sur le bouton ci-dessous.
        </Text>

        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={inviteUrl} style={button}>
            Accepter l'invitation
          </Button>
        </Section>

        <Text style={muted}>
          Ou copiez ce lien dans votre navigateur :<br />
          <a href={inviteUrl} style={link}>{inviteUrl}</a>
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          Cet email a été envoyé à {recipientEmail}. Si vous n'attendiez pas cette invitation,
          vous pouvez l'ignorer.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrganizationInviteEmail,
  subject: (data: Record<string, any>) =>
    `${data?.inviterName ?? 'Un recruteur'} vous invite sur ${SITE_NAME}`,
  displayName: "Invitation à une organisation",
  previewData: {
    inviterName: 'Jane Doe',
    organizationName: 'Acme',
    inviteUrl: 'https://interw.com/invite/abc123',
    recipientEmail: 'user@example.com',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '640px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#111827', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '12px 0' }
const muted = { fontSize: '12px', color: '#6b7280', margin: '16px 0', lineHeight: '1.6' as const }
const link = { color: PRIMARY, textDecoration: 'underline', wordBreak: 'break-all' as const }
const button = {
  backgroundColor: PRIMARY,
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: 'bold' as const,
  fontSize: '15px',
  display: 'inline-block',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#6b7280', margin: '16px 0 0', lineHeight: '1.6' as const }
