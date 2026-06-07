## Objectif
Remplacer le nom de marque « Interw.ai » / « interw.ai » par « Interw » / « interw » dans l'UI, le contenu textuel et les emails.

## Règles
- ✅ Remplacer les mentions de marque dans du texte affiché (titres, descriptions, FAQ, signatures email, footer, etc.)
- ❌ NE PAS toucher aux URLs `https://interw.ai/...` (canonical, og:url, schema.org, liens)
- ❌ NE PAS toucher aux adresses email (`hello@interw.ai`, `contact@interw.ai`, `noreply@interw.ai`)
- ❌ NE PAS toucher aux URLs de démo dans Remotion (`interw.ai/projects/new`, etc.) — ce sont des chrome de navigateur affichant l'URL réelle
- ❌ NE PAS toucher à `demo@interw.local` (domaine technique distinct)

## Fichiers à modifier (texte de marque uniquement)

### Pages
- `src/pages/Landing.tsx` (3 mentions) :
  - ligne 267 : "interw.ai analyse les réponses…" → "interw analyse les réponses…"
  - ligne 740 : "interw.ai ne conduit pas l'entretien…" → "interw…"
  - ligne 747 : "interw.ai favorise-t-il…" → "interw favorise-t-il…"
  - ligne 801 : "comment interw.ai s'intègre…" → "comment interw s'intègre…"
  - ligne 52 : `interw.ai/entretien/marie-d` (chrome navigateur démo) → garder
- `src/pages/Produit.tsx` :
  - ligne 105 (meta description) : "Découvrez interw.ai" → "Découvrez interw"
  - ligne 269 : "voir interw.ai sur vos…" → "voir interw sur vos…"
- `src/pages/OrgPublic.tsx` ligne 123 : footer "Propulsé par Interw.ai" → "Propulsé par Interw" (le `href` reste `https://interw.ai`)
- `src/pages/Settings.tsx` ligne 297 : préfixe affiché `interw.ai/o/` → garder (c'est l'URL réelle de l'org publique, pas une marque)

### Emails transactionnels (texte de signature uniquement, garder mailto/href)
- `supabase/functions/_shared/transactional-email-templates/candidate-abandon-reminder.tsx` ligne 56 : texte du Link `interw.ai` → `interw` (href reste `https://interw.ai`)
- `supabase/functions/_shared/transactional-email-templates/candidate-thank-you.tsx` ligne 108 : idem
- `supabase/functions/_shared/transactional-email-templates/demo-request.tsx` ligne 27 : "Un visiteur du site interw.ai" → "Un visiteur du site interw"
- `supabase/functions/_shared/transactional-email-templates/interview-issue-report.tsx` ligne 7 : `SITE_NAME = 'interw.ai'` → `'interw'`
- `supabase/functions/_shared/transactional-email-templates/interview-report.tsx` :
  - ligne 7 : `SITE_NAME = 'interw.ai'` → `'interw'`
  - ligne 398 : subject `interw.ai - ${candidateName}` → `interw - ${candidateName}`

### Remotion (vidéos de démo)
- `remotion/src/scenes/SceneOutro.tsx` ligne 64 : signature de fin "interw.ai" → "interw"
- `remotion/src/scenes/demo/SceneImpact.tsx` ligne 114 : idem
- Les `BrowserChrome url="interw.ai/..."` représentent l'URL affichée dans une fausse barre d'adresse → **garder** (le site est bien sur interw.ai)

### Sidebar
- `src/components/AppSidebar.tsx` : afficher "Interw" au lieu de "Interw.ai" si présent (déjà vérifié : le brand affiché est `Interw.ai` ou `interw.ai` ?) — à vérifier et ajuster

## Déploiement
- Déployer les Edge Functions de templates email après modification : `send-transactional-email` (les templates sont chargés par cette fonction).

## Hors scope
- Domaine email (toujours `interw.ai`)
- URLs canoniques, OG, schema.org dans `index.html`
- Variables, noms de classes, identifiants techniques
