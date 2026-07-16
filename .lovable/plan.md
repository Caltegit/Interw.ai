## Objectif

Permettre de modifier le contenu du modèle d'email « Reprise entretien » directement depuis l'interface admin, une seule fois, et que **tous les envois suivants** (unitaires ou groupés, y compris les témoins) utilisent cette version modifiée.

Approche volontairement simple : un seul modèle partagé, éditable, avec aperçu — pas de personnalisation par candidat.

## UX proposée

Sur la page `/admin/candidates-to-recover`, ajouter en haut de la carte **Candidats impactés** un bouton **Modifier le modèle d'email**.

Au clic, une popup s'ouvre avec :

1. **Sujet** — champ texte.
2. **Message d'introduction** (avant le bouton) — zone de texte.
3. **Message de clôture** (après le bouton) — zone de texte.
4. Aide affichée sous les champs : variables disponibles `{prenom}`, `{poste}`, `{entreprise}`.
5. **Aperçu** à droite (ou en dessous en mobile) qui se met à jour en direct avec des valeurs d'exemple.
6. Boutons : **Réinitialiser au texte d'origine**, **Annuler**, **Enregistrer**.

Zones **non modifiables** (affichées en lecture seule dans l'aperçu, pour cadrer les attentes) : en-tête « Interw », bouton d'action, lien de secours, encart légal / désinscription — gérés par le système pour ne pas casser la délivrabilité.

Après enregistrement, un petit badge « Modèle personnalisé » s'affiche à côté du bouton, avec date de dernière modification et auteur.

## Comportement

- Modèle unique partagé par tous les envois de type `candidate-recovery-invite`.
- Si aucun enregistrement n'existe : le template par défaut actuel est utilisé (comportement inchangé).
- Modification prise en compte immédiatement pour tous les envois suivants.
- Réservé aux super-admins.

## Détails techniques

### Base de données

Réutiliser la table existante `email_template_overrides` (déjà présente dans le schéma) si sa structure convient : une ligne par `template_name`, colonnes `subject`, `intro_html`, `outro_html`, `updated_by`, `updated_at`.

Si la structure actuelle ne couvre pas ces trois champs, ajouter les colonnes manquantes via migration. RLS : lecture/écriture réservée à `has_role(auth.uid(), 'super_admin')`.

### Edge function `resend-impacted-candidate`

Avant l'appel à `send-transactional-email`, charger la ligne `email_template_overrides` pour `template_name = 'candidate-recovery-invite'` et transmettre `subject_override`, `intro_html`, `outro_html` dans `templateData`.

### Template `candidate-recovery-invite.tsx`

Étendre les props avec `subject_override`, `intro_html`, `outro_html`. Substitution simple des placeholders `{prenom}`, `{poste}`, `{entreprise}` côté serveur avant rendu. Si un champ override est vide → fallback vers le texte d'origine. Le sujet exporté (`subject: (data) => ...`) prend l'override en priorité.

Sanitisation : caractères de contrôle strippés, longueur limitée (~4000 par champ), balises HTML restreintes à `<strong>`, `<em>`, `<br>`, `<p>`, `<a href>`.

### Frontend

- Nouveau composant `EditRecoveryTemplateDialog` sous `src/components/superadmin/`.
- Charge la ligne existante à l'ouverture, propose « Réinitialiser » qui supprime la ligne.
- Aperçu rendu côté client à partir des mêmes chaînes (pas d'appel réseau).

## Hors périmètre

- Pas de personnalisation par candidat.
- Pas d'éditeur riche WYSIWYG.
- Pas d'historique des versions (seule la dernière version est conservée).
