## Objectif

Sur la liste des candidats d'un projet, l'icône enveloppe à droite de chaque ligne doit refléter le dernier modèle d'email envoyé au candidat :

- Rouge → Refus
- Vert → Nouvel entretien
- Orange → Infos complémentaires
- Couleur neutre par défaut (aucun email envoyé)

## Étapes

1. **Base de données**
   - Ajouter une colonne `last_candidate_email_key text` sur la table `sessions` (nullable, valeurs attendues : `candidate-refusal`, `candidate-new-interview`, `candidate-more-info`).

2. **Envoi de l'email (`BulkEmailDialog.tsx`)**
   - Après un envoi réussi, mettre à jour `sessions.last_candidate_email_key = selectedKey` pour chaque destinataire ayant reçu l'email.
   - Appeler `onSent` (déjà existant) pour rafraîchir la liste côté `ProjectDetail`.

3. **Affichage de l'icône (`ProjectDetail.tsx`)**
   - Charger `last_candidate_email_key` avec les sessions.
   - Appliquer une classe de couleur sur l'icône `Mail` selon la valeur :
     - `candidate-refusal` → `text-destructive`
     - `candidate-new-interview` → `text-success` (token existant ou ajout d'un token vert)
     - `candidate-more-info` → `text-warning` (token existant ou ajout d'un token orange)
     - Sinon : couleur par défaut.
   - Ajouter un `title` dynamique indiquant le type d'email envoyé.
   - Rafraîchir la liste après envoi (via `onSent` qui rejoue le fetch des sessions).

## Détails techniques

- La colonne est mise à jour côté client (RLS doit permettre au RH de mettre à jour ses propres sessions — à vérifier ; sinon ajouter une RPC `set_session_last_email_key`).
- Vérifier les tokens `success` / `warning` dans `index.css` / `tailwind.config.ts` ; les ajouter si absents pour rester conforme au design system (HSL, semantic tokens).
- Aucun changement sur l'envoi vers les rapports partagés ni sur les autres dialogues.
