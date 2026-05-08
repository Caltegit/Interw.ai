# Actions groupées sur les candidats (vue tableau)

Ajouter de la sélection multiple et 2 actions groupées (supprimer, envoyer un email) dans la vue tableau de `ProjectDetail`, plus 3 nouveaux templates d'email modifiables dans la bibliothèque.

## 1. UI — vue tableau (`src/pages/ProjectDetail.tsx`)

- Nouvel état `selectedIds: Set<string>`.
- Nouvelle 1ʳᵉ colonne dans `<thead>` et `<tbody>` : checkbox (composant `Checkbox` shadcn déjà présent).
  - Header : checkbox « tout sélectionner sur la page » (état indeterminate géré).
  - Lignes : checkbox sur chaque candidat (clic = `e.stopPropagation()` pour ne pas déclencher `onRowClick`).
- Barre d'actions visible uniquement si `selectedIds.size > 0`, rendue **au-dessus** et **en-dessous** du tableau :
  - Affiche « N candidat(s) sélectionné(s) ».
  - `DropdownMenu` « Actions » avec deux items : *Envoyer un email*, *Supprimer*.
  - Bouton « Tout désélectionner ».
- La sélection se réinitialise quand `filteredSessions` change (nouveau filtre / changement de page).

## 2. Suppression groupée (double confirmation)

- 1ʳᵉ `AlertDialog` : « Supprimer N candidat(s) ? Action irréversible. » → boutons Annuler / Continuer.
- 2ᵉ `AlertDialog` : « Confirmer définitivement la suppression de N candidat(s) ? » → boutons Annuler / Supprimer.
- À la confirmation : appel en parallèle de la edge function existante `delete-session` pour chaque id, invalidation des queries du projet, toast de bilan (succès / échecs), reset sélection.

## 3. Envoi d'email groupé

- Nouveau composant `src/components/project/BulkEmailDialog.tsx` :
  - Sélecteur de template (3 options décrites plus bas) — pré-remplit objet et corps.
  - Champs éditables :
    - **Objet** (modifiable, par défaut `"<Sujet template> - <project.title>"`).
    - **Corps** (textarea, modifiable). Le corps utilise un placeholder visuel `Bonjour {{prenom}},` (remplacé par le prénom réel de chaque candidat à l'envoi).
  - Aperçu : « Sera envoyé à N candidats depuis `noreply@interw.ai` ».
  - Bouton *Envoyer*.
- À l'envoi : pour chaque session sélectionnée, appel de `supabase.functions.invoke('send-transactional-email', { body: { templateName: 'bulk-candidate-message', recipientEmail, idempotencyKey, templateData: { firstName, subject, body } } })`. Toast bilan, fermeture, reset sélection.

## 4. Nouveau template transactionnel `bulk-candidate-message`

Fichier `supabase/functions/_shared/transactional-email-templates/bulk-candidate-message.tsx` :
- Props : `{ subject, body, firstName }`.
- Composant React Email simple (Heading + paragraphes). Le corps est rendu en respectant les sauts de ligne (split sur `\n` → `<Text>`). Aucune injection HTML brute.
- `subject` du `TemplateEntry` = fonction qui renvoie `data.subject`.
- Inscription dans `registry.ts`.
- Déploiement de `send-transactional-email` après modif.

L'expéditeur `noreply@interw.ai` est déjà géré par l'infra (domaine `interw.ai` configuré).

## 5. Trois templates métier modifiables (bibliothèque emails)

Ajout de 3 templates « courts et simples » exposés dans `EmailTemplates.tsx` (via `get-email-template-defaults` + `_shared/transactional-email-templates/registry.ts`), surchargables par l'orga (table existante `email_template_overrides`) :

- **`candidate-refusal`** — Objet : `Refus - {{sessionName}}`
  > Bonjour {{prenom}},  
  > Merci pour le temps consacré à votre entretien. Après étude attentive de votre candidature, nous ne donnerons pas suite à ce stade.  
  > Nous vous souhaitons une belle réussite dans la suite de vos démarches.

- **`candidate-new-interview`** — Objet : `Nouvel entretien - {{sessionName}}`
  > Bonjour {{prenom}},  
  > Suite à votre premier échange, nous souhaiterions vous proposer un nouvel entretien.  
  > Pouvez-vous nous indiquer vos disponibilités sur les prochains jours ?

- **`candidate-more-info`** — Objet : `Infos complémentaires - {{sessionName}}`
  > Bonjour {{prenom}},  
  > Pour finaliser l'étude de votre candidature, nous aurions besoin de quelques informations complémentaires.  
  > Pouvez-vous nous répondre dès que possible ?

Dans le `BulkEmailDialog`, le sélecteur de template charge ces 3 défauts (et applique les overrides de l'orga si présents) via `get-email-template-defaults`. Variables remplacées côté client avant envoi : `{{prenom}}` (par session), `{{sessionName}}` (= `project.title`, identique pour tous).

## Notes techniques

- Ne pas modifier la vue cartes (hors scope).
- Garder les patterns existants (React Query, invalidations sur `queryKeys.projectDetail`, toast helpers).
- Les checkboxes ne doivent jamais ouvrir la session (stopPropagation systématique).
- Sécurité : `delete-session` et `send-transactional-email` font déjà la vérification d'appartenance / RLS — pas de changement DB nécessaire.
