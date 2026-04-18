

## Page "Emails" — gestion des templates

### Vision
Ajouter une page `/emails` dans le sidebar (sous "Bibliothèque") qui permet aux admins de l'org de visualiser et personnaliser tous les emails envoyés par la plateforme : emails d'authentification (signup, reset, invitation, etc.) et emails transactionnels (à venir).

### Réalité technique importante
Les templates d'emails actuels sont des fichiers `.tsx` React Email dans `supabase/functions/_shared/email-templates/` (auth) et `_shared/transactional-email-templates/` (transactionnels). Ces fichiers sont **codés en dur** et déployés avec les Edge Functions — ils ne sont **pas modifiables à chaud** depuis l'UI sans architecture supplémentaire.

Deux approches possibles :

**Option A — Visualisation + override DB (recommandé)**
- Page `/emails` qui liste tous les templates avec aperçu (via `preview-transactional-email` + endpoint similaire pour auth).
- Nouvelle table `email_template_overrides` (org_id, template_key, subject, html_body, variables) — quand un override existe, il prend le pas sur le template `.tsx` par défaut.
- Éditeur dans l'UI : sujet + corps HTML (avec variables `{{recipient}}`, `{{confirmationUrl}}`, etc.) + aperçu live.
- Modifs `auth-email-hook` et `send-transactional-email` pour vérifier d'abord l'override en DB avant d'utiliser le template par défaut.
- ✅ Modification 100% via UI, par org, sans redéploiement.
- ⚠️ Éditeur HTML brut (pas de WYSIWYG riche, sinon scope énorme).

**Option B — Visualisation seule (read-only)**
- Page `/emails` qui liste et affiche l'aperçu des templates `.tsx` actuels.
- Pour modifier : l'utilisateur me demande dans le chat ("change le sujet du signup en X"), j'édite le `.tsx` et redéploie.
- ✅ Simple, rapide à livrer.
- ❌ Pas vraiment "gestion" — juste de la visualisation.

### Plan recommandé (Option A)

**1. DB — table `email_template_overrides`**
```
- id uuid PK
- organization_id uuid (FK orgs)
- template_key text  -- 'signup' | 'recovery' | 'invite' | 'magic-link' | 'email-change' | 'reauthentication' | 'contact-confirmation' | ...
- subject text
- html_body text  -- HTML brut avec placeholders {{var}}
- enabled boolean default true
- updated_at, updated_by
- UNIQUE (organization_id, template_key)
```
RLS : admins de l'org peuvent SELECT/INSERT/UPDATE/DELETE leurs overrides.

**2. Edge Functions — résolution override**
- `auth-email-hook` : avant de rendre le template `.tsx`, query `email_template_overrides` par org + key. Si trouvé et enabled → render le HTML override avec interpolation `{{var}}`. Sinon → fallback sur le `.tsx`.
- `send-transactional-email` : même logique.
- Nouvelle fonction `get-email-template-defaults` (auth requise) : retourne le HTML par défaut rendu de chaque template (pour pré-remplir l'éditeur "Reset to default").

**3. Sidebar**
- Ajouter "Emails" dans `librarySubItems` de `AppSidebar.tsx` (sous Bibliothèque, après Intros) avec icône `Mail`.

**4. Page `src/pages/EmailTemplates.tsx` (route `/library/emails`)**
- Liste des templates groupés : **Authentification** (6 templates) + **Notifications app** (transactionnels enregistrés dans `registry.ts`).
- Chaque ligne : nom, statut (Défaut / Personnalisé), bouton "Modifier".
- Dialog d'édition :
  - Champ Sujet (input)
  - Champ Corps (textarea HTML, monospace)
  - Liste des variables disponibles pour ce template (chips cliquables qui insèrent `{{var}}`)
  - Aperçu live (iframe sandbox) à droite
  - Boutons : Sauvegarder / Réinitialiser au défaut / Annuler
- Réservé aux admins de l'org (check via `useOrgRole`).

**5. Routing**
- `src/App.tsx` : route protégée `/library/emails` → `EmailTemplates`.

### Templates concernés (au lancement)
Auth : signup, recovery, invite, magic-link, email-change, reauthentication
Transactionnels : ceux enregistrés dans `registry.ts` (vide pour l'instant, mais l'UI les prendra en compte dynamiquement quand tu en ajouteras)

### Hors scope (V2 possible)
- Éditeur WYSIWYG (TipTap/MJML) — pour l'instant HTML brut
- Versioning des templates (historique des modifs)
- A/B testing
- Multi-langue par template
- Édition des templates par projet (uniquement par org pour l'instant)

### Questions
1. **Option A (override DB éditable) ou Option B (visualisation seule, modifs via chat) ?** → je recommande A
2. **Pour Option A, l'éditeur HTML brut te convient-il** (avec aperçu live + variables cliquables), ou tu veux un éditeur visuel type WYSIWYG (scope plus gros, ~+50% de boulot) ?
3. **Qui peut éditer** : admins de l'org seulement, ou tous les recruteurs ?

