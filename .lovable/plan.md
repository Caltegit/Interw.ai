# Détecter une voix déjà clonée avant d'ouvrir le clonage

Quand on clique sur "Cloner ma voix" depuis le formulaire projet, vérifier si l'utilisateur a déjà une voix clonée (`profiles.cloned_voice_id`). Si oui, afficher un AlertDialog : "Vous avez déjà cloné une voix ([nom]). Pour en créer une nouvelle, supprimez d'abord la voix existante." avec deux actions : **Supprimer et recloner** / **Annuler**.

## Changements

`src/components/project/ProjectForm.tsx` :
- Importer `useEffect`, `supabase`, `useAuth`, et les composants `AlertDialog*`.
- Ajouter états : `existingClonedVoice: { id, name } | null`, `confirmReplaceOpen: boolean`, `deletingVoice: boolean`.
- `useEffect` au montage : `select cloned_voice_id, cloned_voice_name from profiles where user_id = user.id` → renseigne `existingClonedVoice`.
- Modifier le handler du bouton "Cloner ma voix" :
  - Si `existingClonedVoice` → ouvrir `confirmReplaceOpen`.
  - Sinon → ouvrir `cloneDialogOpen` directement.
- Ajouter `<AlertDialog open={confirmReplaceOpen}>` avec :
  - Titre : "Voix déjà clonée"
  - Description : "Vous avez déjà cloné une voix (« [nom] »). Pour en créer une nouvelle, l'ancienne sera supprimée définitivement."
  - Cancel : "Annuler"
  - Action : "Supprimer et recloner" → appelle `supabase.functions.invoke("delete-cloned-voice")`, puis sur succès : `setExistingClonedVoice(null)`, ferme l'alerte, ouvre `cloneDialogOpen`.
- Dans `onCloned` du `VoiceCloneDialog`, mettre à jour `existingClonedVoice` avec la nouvelle voix pour rester cohérent si l'utilisateur reclique.

## Hors scope

- Pas de changement à `VoiceCloneDialog`, `delete-cloned-voice`, ni à la page Paramètres.
- Pas de schéma BDD modifié.
