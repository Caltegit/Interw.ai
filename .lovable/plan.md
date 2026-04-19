

## Plan — Traduction et branding des emails d'authentification en français

### Constat

Les 6 templates auth (`supabase/functions/_shared/email-templates/*.tsx`) sont :
- **En anglais** ("Confirm your email", "Reset your password", "You've been invited"…)
- **Sans branding Interw.ai** (boutons noirs `#000000`, police Arial, pas de logo, ton générique)

Ce sont les emails que reçoivent les recruteurs quand ils s'inscrivent, réinitialisent leur mot de passe ou sont invités dans une organisation.

### Ce que je vais faire

**1. Traduire les 6 templates en français** avec un ton cohérent avec le reste de l'app (tutoiement léger / vouvoiement professionnel — j'aligne sur ce qui est déjà utilisé dans `Unsubscribe.tsx` et `DemoRequestDialog.tsx` = vouvoiement).

| Template | Avant (EN) | Après (FR) |
|---|---|---|
| `signup.tsx` | "Confirm your email" | "Confirmez votre adresse email" |
| `recovery.tsx` | "Reset your password" | "Réinitialisez votre mot de passe" |
| `magic-link.tsx` | "Your login link" | "Votre lien de connexion" |
| `invite.tsx` | "You've been invited" | "Vous êtes invité(e) sur Interw.ai" |
| `email-change.tsx` | "Confirm your email change" | "Confirmez votre changement d'email" |
| `reauthentication.tsx` | "Confirm reauthentication" | "Code de vérification" |

**2. Appliquer le branding Interw.ai** sur les 6 fichiers :
- Couleur primaire : `#6366F1` (indigo) au lieu de `#000000` pour les boutons et titres.
- Police : `Inter, Arial, sans-serif` au lieu de `Arial, sans-serif`.
- Border radius bouton : `8px` (cohérent avec l'app).
- Fond du body : reste `#ffffff` (règle stricte des emails).
- Footer : court rappel "L'équipe Interw.ai".

**3. Redéployer la fonction `auth-email-hook`**

Les Edge Functions servent le code **déployé**, pas le code dans les fichiers — donc obligatoire après modif.

### Fichiers touchés

- `supabase/functions/_shared/email-templates/signup.tsx`
- `supabase/functions/_shared/email-templates/recovery.tsx`
- `supabase/functions/_shared/email-templates/magic-link.tsx`
- `supabase/functions/_shared/email-templates/invite.tsx`
- `supabase/functions/_shared/email-templates/email-change.tsx`
- `supabase/functions/_shared/email-templates/reauthentication.tsx`
- Redéploiement de `auth-email-hook`.

### Hors scope

- Les templates transactionnels (déjà en français).
- Toute modif du fichier `auth-email-hook/index.ts` (juste les templates).

