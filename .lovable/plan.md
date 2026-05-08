## Objectif

Rendre la ligne « Bonjour PRÉNOM, » modifiable (faire partie du corps éditable) et mettre à jour les 3 modèles d'email candidats avec les nouveaux textes (incluant la signature « À bientôt, L'équipe de recrutement »).

## Modifications

### 1. `src/components/project/BulkEmailDialog.tsx`

- Mettre à jour `DEFAULT_TEMPLATES` avec les 3 nouveaux corps complets, chacun commençant par `Bonjour {firstName},` et terminant par `À bientôt,\n\nL'équipe de recrutement` :
  - **Refus** : « Bonjour {firstName}, / Merci pour le temps consacré à votre entretien. / Après étude attentive de votre candidature, nous ne donnerons pas suite à ce stade. / Nous vous souhaitons une belle réussite dans la suite de vos démarches. / À bientôt, / L'équipe de recrutement »
  - **Nouvel entretien** : « Bonjour {firstName}, / Suite à votre premier échange, nous souhaiterions vous proposer un nouvel entretien. / Pouvez-vous nous indiquer vos disponibilités sur les prochains jours ? / À bientôt, / L'équipe de recrutement »
  - **Infos complémentaires** : « Bonjour {firstName}, / Pour finaliser l'étude de votre candidature, nous aurions besoin de quelques informations complémentaires. / Pouvez-vous nous répondre dès que possible ? / À bientôt, / L'équipe de recrutement »
- Avant l'envoi, remplacer `{firstName}` dans le corps par le prénom du destinataire (fallback : chaîne vide proprement gérée — si pas de prénom, la ligne devient « Bonjour, »).
- Supprimer la note « Chaque email commencera automatiquement par "Bonjour PRÉNOM," ». La remplacer par : « Utilisez `{firstName}` pour insérer le prénom du candidat. »

### 2. `supabase/functions/_shared/transactional-email-templates/bulk-candidate-message.tsx`

- Retirer la ligne `greeting` ajoutée automatiquement (`Bonjour ${firstName},`). Le corps reçu contient déjà la salutation.
- Conserver le rendu paragraphe par paragraphe avec retours à la ligne.
- Garder `firstName` dans les props pour compatibilité (mais ne plus l'utiliser pour préfixer).

### 3. Personnalisations existantes en base (`candidate_message_templates`)

- Ne pas migrer automatiquement les anciens overrides : si une organisation a déjà personnalisé un modèle, son texte reste tel quel (sans « Bonjour PRÉNOM » puisque c'était auto-injecté). 
- Note pour l'utilisateur : ces orgs devront ré-ouvrir leur modèle et ajouter eux-mêmes `Bonjour {firstName},` en début de message. (À confirmer si tu veux que je réinitialise les overrides existants.)

## Fichiers touchés

- `src/components/project/BulkEmailDialog.tsx`
- `supabase/functions/_shared/transactional-email-templates/bulk-candidate-message.tsx`
