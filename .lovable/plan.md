## Objectif

À l'étape 5 du wizard (Récapitulatif), ajouter une section **« Modifier l'e‑mail envoyé au candidat »** (repliable) qui permet d'éditer l'objet et le corps du mail de remerciement envoyé après l'entretien. L'encart RGPD (texte + bouton « Mes données personnelles ») reste **toujours présent, non éditable, en bas du mail**. Une case à cocher permet d'enregistrer le contenu comme **template par défaut au niveau de l'organisation** pour les futurs projets (non rétroactif).

## UX dans le wizard (étape 5)

Nouvelle carte placée juste après la carte « Destinataires des rapports » :

- Titre : « Email envoyé au candidat après l'entretien »
- Texte d'aide : « Ce message est envoyé automatiquement à chaque candidat à la fin de son entretien. Un encart RGPD avec le lien pour supprimer ses données est ajouté automatiquement à la fin et ne peut pas être retiré. »
- Champ **Objet** (input)
- Champ **Message** (textarea ~7 lignes) avec mention `{firstName}`, `{jobTitle}`, `{orgName}` utilisables
- Aperçu en lecture seule de l'encart RGPD final (grisé) pour bien montrer qu'il sera ajouté
- Checkbox : « Garder ce texte comme modèle par défaut pour mes prochains projets »
- Bouton secondaire « Réinitialiser au modèle par défaut »

Valeurs par défaut au chargement :
1. Valeurs existantes du projet (si édition).
2. Sinon, override `candidate-thank-you` de l'organisation (table `candidate_message_templates`).
3. Sinon, texte par défaut (extrait du template actuel `candidate-thank-you.tsx`).

## Backend / DB

1. **Migration** : ajouter deux colonnes sur `public.projects` :
   - `candidate_email_subject text`
   - `candidate_email_body text`
   (nullable → si null, on tombe sur l'override orga puis le défaut)

2. Réutiliser la table existante `candidate_message_templates` (déjà utilisée par `BulkEmailDialog`) avec une **nouvelle key** `candidate-thank-you` pour stocker l'override orga quand la case est cochée.

## Email (Edge Function)

Fichier : `supabase/functions/_shared/transactional-email-templates/candidate-thank-you.tsx`

- Le template accepte de nouveaux props optionnels `customSubject`, `customBody`.
- Si `customBody` est fourni, il remplace les blocs « Bonjour … / Merci d'avoir passé … / Vos réponses … » (texte libre rendu avec `\n` → paragraphes). Les variables `{firstName}`, `{jobTitle}`, `{orgName}` sont substituées côté serveur avant rendu.
- L'encart **RGPD + bouton « Mes données personnelles »** reste codé en dur dans le template et est rendu **inconditionnellement**, après le corps personnalisé.
- `subject` du template devient une fonction qui renvoie `customSubject` s'il existe, sinon le sujet par défaut.

Fichier : `supabase/functions/finalize-session/index.ts` (fonction `sendCandidateThankYou`)
- Étendre le `select` projects pour récupérer `candidate_email_subject, candidate_email_body, organization_id`.
- Si vides, lire dans `candidate_message_templates` (org + key `candidate-thank-you`).
- Substituer `{firstName}/{jobTitle}/{orgName}` et passer `customSubject` + `customBody` à `templateData`.

## Frontend

Fichier : `src/components/project/ProjectForm.tsx`
- Nouveaux états : `candidateEmailSubject`, `candidateEmailBody`, `saveCandidateEmailAsDefault`.
- Au mount (édition) : hydrater depuis `projects` puis fallback orga puis défaut.
- À la soumission (`handleSave`) :
  - Persister `candidate_email_subject` / `candidate_email_body` sur le projet (null si égal au défaut courant).
  - Si checkbox cochée : `upsert` dans `candidate_message_templates` `(organization_id, key='candidate-thank-you', subject, body)`.
- Ajouter le nouveau bloc UI au step 4 (étape 5 affichée).

Fichier : `src/pages/ProjectNew.tsx` / payload de création : même chose pour la création initiale.

## Hors périmètre

- Pas de modification du template `bulk-candidate-message` ni du dialogue d'envoi groupé.
- Pas de rétro‑application : les projets existants gardent leurs valeurs (null = défaut courant).
- Pas de prévisualisation HTML rendue du mail (juste l'aperçu RGPD statique).

## Détails techniques

| Élément | Fichier |
|---|---|
| Migration colonnes | nouvelle migration SQL |
| UI step 5 | `src/components/project/ProjectForm.tsx` (~ligne 1200, après carte destinataires) |
| Persistance projet | `src/components/project/ProjectForm.tsx` (`handleSave`) + `src/pages/ProjectNew.tsx` |
| Template | `supabase/functions/_shared/transactional-email-templates/candidate-thank-you.tsx` |
| Trigger | `supabase/functions/finalize-session/index.ts` |
| Déploiement | `deploy_edge_functions` sur `finalize-session` et `send-transactional-email` |
