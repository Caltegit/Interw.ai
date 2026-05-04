# Ajouter "Cloner ma voix" dans le formulaire projet

À côté du lien "Modifier la voix" dans `src/components/project/ProjectForm.tsx` (étape Infos), ajouter un second lien "Cloner ma voix" qui ouvre la `VoiceCloneDialog` existante (`src/components/settings/VoiceCloneDialog.tsx`), déjà utilisée dans Paramètres.

## Changements

`src/components/project/ProjectForm.tsx` :
- Importer `VoiceCloneDialog` depuis `@/components/settings/VoiceCloneDialog`.
- Ajouter un état local `cloneDialogOpen` (booléen).
- Sous le bloc voix, transformer le conteneur du lien en `flex gap-4` et ajouter un second bouton lien "Cloner ma voix" qui passe `cloneDialogOpen` à `true`.
- Monter `<VoiceCloneDialog>` avec `defaultName={aiPersonaName || "Ma voix"}` et `onCloned={(id) => { setTtsVoiceId(id); setTtsProvider("elevenlabs"); }}` pour que la voix clonée soit immédiatement sélectionnée pour le projet.

## Hors scope

- Aucun changement de schéma BDD, d'edge function ou de la `VoiceCloneDialog` elle-même.
- Pas de modif de la page Paramètres.
