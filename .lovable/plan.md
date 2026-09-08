# Bouton « Ajouter aux ressources » (étape 2 Critères)

## Ce qui se passe aujourd'hui
Le clic ne fait que marquer le critère en interne. L'enregistrement réel n'a lieu qu'au moment où le poste entier est sauvegardé, et si le critère vient déjà de la bibliothèque ou si l'enregistrement du poste n'aboutit pas, rien n'arrive dans les ressources. Visuellement, seul l'icône change légèrement de couleur : on a l'impression que rien ne se passe.

## Correction proposée
Le clic enregistre immédiatement le critère dans les ressources, sans attendre la sauvegarde du poste.

1. Au clic :
   - si le libellé est vide, message d'erreur (déjà en place) ;
   - sinon, enregistrement direct du critère (libellé, description, pondération, échelle, portée, repères, catégorie) dans les ressources de l'organisation ;
   - message de confirmation « Critère ajouté aux ressources », ou message d'erreur explicite si l'enregistrement échoue.
2. Une fois enregistré, l'icône passe en état « ajouté » (couleur pleine + infobulle « Déjà dans vos ressources ») et le bouton est désactivé pour éviter les doublons.
3. Le doublon exact (même libellé déjà présent dans les ressources de l'organisation) est détecté : message « Déjà dans vos ressources » plutôt qu'une seconde copie.
4. Suppression de l'enregistrement différé à la sauvegarde du poste, pour éviter un double ajout.

## Détails techniques
- `src/components/project/StepCriteria.tsx` : le bouton devient asynchrone, insère dans `criteria_templates` via le client backend (organisation via `get_user_organization_id`, `created_by` = utilisateur courant), gère l'état `saving` / `saved` par ligne et les erreurs.
- `src/pages/ProjectNew.tsx` et `src/pages/ProjectEdit.tsx` : retrait du bloc d'insertion `criteria_templates` basé sur `save_to_library`.
- Contrôle final : compilation du projet et vérification visuelle de l'étape 2 (message de confirmation, présence du critère dans la page Ressources).
