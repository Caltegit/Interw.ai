# Migration interw.ai → interw.com (domaine canonique)

## Stratégie

Les deux domaines restent actifs. `interw.com` devient le domaine canonique pour le SEO. Aucune redirection 301 pour l'instant — `.ai` reste indépendant et sert l'app actuelle sans interruption. Au lancement d'une future nouvelle plateforme, on repointe uniquement le DNS `.com`. La 301 `.ai → .com` sera ajoutée plus tard, une fois le nouveau backend validé.

## Décisions prises

- **Domaines** : Option 2 — deux domaines actifs, `.com` canonique, pas de 301
- **Emails** : Migrer l'envoi vers `notify.interw.com` (nouveau sous-domaine, DNS dédié)
- **Marque** : « Interw » (sans extension) dans tous les textes visibles

## 1. Connecter interw.com comme domaine personnalisé

Action manuelle dans **Project Settings → Domains** :
- Ajouter `interw.com` (A record → 185.158.133.1, TXT `_lovable`)
- Ajouter `www.interw.com` (A record → 185.158.133.1)
- Définir `interw.com` comme domaine **primaire** → `interw.ai` reste actif mais secondaire
- SSL provisionné automatiquement par Lovable

L'hébergement Lovable gère le routing SPA sur les deux domaines automatiquement (pas de `_redirects`).

## 2. Canonical et métadonnées SEO → interw.com

**`index.html`** — remplacer toutes les références `interw.ai` → `interw.com` :
- `<link rel="canonical" href="https://interw.com/" />`
- `<meta property="og:url" content="https://interw.com/" />`
- `<meta property="og:image" content="https://interw.com/og-cover.jpg" />`
- `<meta name="twitter:image" content="https://interw.com/og-cover.jpg" />`
- JSON-LD `url`, `email`, `publisher.url`

**Nom de marque** : remplacer « Interw.ai » → « Interw » dans :
- `<title>` : `Interw — Sessions vidéo IA pour le recrutement`
- `<meta property="og:site_name">` : `Interw`
- `<meta property="og:title">` et `twitter:title`
- `<meta name="description">` : remplacer « Interw.ai » par « Interw »

**`public/robots.txt`** — ajouter la directive sitemap :
```
Sitemap: https://interw.com/sitemap.xml
```

**`public/sitemap.xml`** (si existant) ou script `scripts/generate-sitemap.ts` — `BASE_URL = "https://interw.com"`.

## 3. Migrer l'envoi email vers notify.interw.com

### 3a. Configurer le nouveau domaine d'envoi

Action dans **Cloud → Emails** :
- Configurer `notify.interw.com` comme nouveau domaine d'envoi Lovable
- Récupérer les NS records à ajouter chez le registrar de `interw.com`
- Attendre la vérification DNS (jusqu'à 72h)

Le sous-domaine `notify.interw.ai` reste actif pendant la transition — les deux peuvent coexister.

### 3b. Code : remplacer les constantes d'envoi

Une fois `notify.interw.com` vérifié, remplacer dans les Edge Functions :

| Fichier | Changement |
|---------|-----------|
| `supabase/functions/send-transactional-email/index.ts` | `SENDER_DOMAIN` et `FROM_DOMAIN` → `notify.interw.com` |
| `supabase/functions/generate-report/index.ts` | `SENDER_DOMAIN` et `FROM_DOMAIN` → `notify.interw.com` |
| `supabase/functions/auth-email-hook/index.ts` | `SENDER_DOMAIN`, `FROM_DOMAIN`, `ROOT_DOMAIN` → `interw.com` |
| `supabase/functions/request-password-reset-code/index.ts` | `SENDER_DOMAIN`, `FROM_DOMAIN`, `REPLY_TO_EMAIL` → `hello@interw.com` |

### 3c. Adresses de contact

Remplacer `hello@interw.ai` → `hello@interw.com` et `contact@interw.ai` → `contact@interw.com` dans :

**Edge Functions** :
- `auth-email-hook/index.ts` (REPLY_TO_EMAIL)
- `request-password-reset-code/index.ts` (REPLY_TO_EMAIL)
- `report-interview-issue/index.ts` (recipientEmail, hello@)
- `send-transactional-email/index.ts` (DEFAULT_REPLY_TO)
- `_shared/transactional-email-templates/demo-request.tsx` (to: hello@)
- `_shared/transactional-email-templates/candidate-thank-you.tsx` (contact@)

**Frontend** :
- `src/pages/Legal.tsx` (mailto:hello@interw.ai → hello@interw.com)
- `src/pages/Privacy.tsx` (mailto:hello@interw.ai → hello@interw.com)
- `src/components/landing/DemoRequestDialog.tsx` (hello@interw.ai)
- `src/components/feedback/NewFeedbackDialog.tsx` (recipientEmail: hello@interw.ai)
- `src/components/project/BulkEmailDialog.tsx` (noreply@interw.ai)
- `src/components/project/ShareReportsDialog.tsx` (noreply@interw.ai)

### 3d. Redéployer les Edge Functions

Après tous les changements, redéployer :
`auth-email-hook`, `send-transactional-email`, `generate-report`, `request-password-reset-code`, `report-interview-issue`.

## 4. URLs dans les emails et Edge Functions → interw.com

Remplacer `https://interw.ai` → `https://interw.com` dans toutes les URLs générées :

**Edge Functions** (URLs construites pour emails, rapports, liens) :
- `generate-report/index.ts` (reportUrl)
- `report-interview-issue/index.ts` (sessionUrl)
- `send-weekly-recaps/index.ts` (reportUrl, projectUrl)
- `check-email-failures/index.ts` (dashboardUrl)
- `process-report-queue/index.ts` (privacyUrl)
- `resend-impacted-candidate/index.ts` (PUBLIC_APP_URL)
- `send-abandon-reminders/index.ts` (SITE_URL)
- `daily-health-report/index.ts` (SITE_URL)
- `send-invitation/index.ts` (fallback origin)
- `get-email-template-defaults/index.ts` (SITE_URL, SAMPLE_URL)

**Templates email** (données d'exemple et URLs) :
- `_shared/transactional-email-templates/weekly-project-recap.tsx`
- `_shared/transactional-email-templates/organization-invite.tsx`
- `_shared/transactional-email-templates/interview-report.tsx`
- `_shared/transactional-email-templates/interview-issue-report.tsx`
- `_shared/transactional-email-templates/feedback-copy.tsx`
- `_shared/transactional-email-templates/email-failure-alert.tsx`
- `_shared/transactional-email-templates/candidate-thank-you.tsx`
- `_shared/transactional-email-templates/candidate-recovery-invite.tsx`
- `_shared/transactional-email-templates/candidate-abandon-reminder.tsx`
- `_shared/transactional-email-templates/daily-health-report.tsx`

## 5. Frontend : remplacer interw.ai par interw.com

**Pages** :
- `src/pages/Landing.tsx` (texte affiché `interw.ai/entretien/marie-d`)
- `src/pages/OrgPublic.tsx` (lien propulsé par)
- `src/pages/Settings.tsx` (affichage slug `interw.ai/o/`)
- `src/components/superadmin/EditRecoveryTemplateDialog.tsx` (URL exemple)

**Affichage marque « Interw »** : remplacer « Interw.ai » → « Interw » dans les textes visibles (Landing.tsx déjà partiellement en « interw » minuscule, vérifier la casse).

## 6. Tests E2E et seed

- `tests/e2e/helpers/constants.ts` : `e2e-test@interw.ai` → `e2e-test@interw.com` (et mettre à jour l'utilisateur en base via seed-e2e-user)
- `tests/e2e/README.md` : même remplacement
- `supabase/functions/seed-e2e-user/index.ts` : email seed

⚠️ Le changement d'email E2E nécessite de re-seed l'utilisateur test. À faire uniquement si les tests tournent sur `.com`.

## 7. Vidéos Remotion (assets marketing)

Les scènes Remotion contiennent `interw.ai` dans les mockups de navigateur :
- `remotion/src/components/BrowserChrome.tsx` (url par défaut)
- `remotion/src/scenes/SceneStep1-4.tsx`, `SceneOutro.tsx`
- `remotion/src/scenes/demo/Scene*.tsx`

Remplacer → `interw.com` pour cohérence marketing. Non bloquant pour l'app.

## 8. REBUILD_SPEC.md

Mettre à jour les références documentaires `interw.ai` → `interw.com` et marque « Interw.ai » → « Interw ». Non bloquant pour l'app.

## 9. Supabase Auth : URLs de redirection

Vérifier dans **Cloud → Auth** que les URLs autorisées incluent `https://interw.com/**` (en plus de `.ai`). Le code utilise déjà `window.location.origin` pour les redirects, donc pas de changement code — juste une autorisation côté config Auth.

## 10. Publication

Après validation de tous les changements :
1. Publier sur `interw.com` (preview_ui--publish)
2. Vérifier que `interw.ai` reste fonctionnel (domaine secondaire)
3. Tester un parcours candidat complet sur `interw.com`
4. Tester l'envoi d'un email (vérifier le From `@notify.interw.com`)

## Ordre d'exécution

```text
1. Connecter interw.com (DNS + domaine primaire Lovable)     ← manuel, peut prendre 72h
2. Configurer notify.interw.com (Cloud → Emails)              ← manuel, DNS
3. Auth: autoriser interw.com dans les redirect URLs           ← manuel, Cloud → Auth
   ── pendant que le DNS propage ──
4. Modifier index.html (canonical, métadonnées, marque)
5. Modifier le frontend (URLs, textes de marque)
6. Modifier les Edge Functions (domaines d'envoi, URLs, emails contact)
7. Modifier les templates email (URLs, données d'exemple)
8. Redéployer les Edge Functions
9. Publier
10. Tester
```

## Points d'attention

- **Période de transition DNS** : pendant que `notify.interw.com` se vérifie, `notify.interw.ai` continue d'envoyer. Ne pas désactiver `.ai` tant que `.com` n'est pas vérifié.
- **Réputation email** : `notify.interw.com` est un domaine neuf. Prévoir une période de chauffe (quelques jours) avant de basculer 100% du volume.
- **Google Search Console** : ajouter `interw.com` comme nouvelle propriété. Faire valider la propriété puis soumettre le sitemap `https://interw.com/sitemap.xml`.
- **Pas de 301 maintenant** : `.ai` reste actif et indépendant. La 301 sera ajoutée au moment du lancement d'une éventuelle nouvelle plateforme.
- **Tests E2E** : ne changer les emails de test que si on migre les tests vers `.com`. Sinon garder `e2e-test@interw.ai` pour l'instant.
