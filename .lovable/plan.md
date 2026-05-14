## Objectif

1. Supprimer l'onglet **Réponses** de la page session.
2. Afficher la transcription audio du candidat **sous la vidéo**, juste en dessous de la ligne Précédent / Vitesse / Suivant, dans un bloc dépliable (Collapsible) de la même hauteur que la carte « Notes recruteur ».

## Changements

### `src/pages/SessionDetail.tsx`
- Retirer le `TabsTrigger value="answers"` (ligne ~467) et le `TabsContent value="answers"` (lignes ~626-638).
- Retirer l'import et l'usage de `QuestionAnswerRow` ainsi que le `useMemo` `questionItems` (devenus inutiles).
- Construire un map `transcriptsByMessageId: Record<string, string>` à partir de `messages` (role candidat → `content`) et le passer en prop à `SessionVideoNavigator`.

### `src/components/session/SessionVideoNavigator.tsx`
- Ajouter une prop optionnelle `transcripts?: Record<string, string>`.
- Sous la rangée des boutons Précédent / Vitesse / Suivant, ajouter un `Collapsible` (shadcn) :
  - Trigger : bouton plein largeur « Transcription » avec chevron, fermé par défaut.
  - Contenu : bloc `min-h-[220px]` (même hauteur que le textarea Notes recruteur), texte en `text-sm leading-relaxed`, scroll vertical, qui affiche `transcripts[current.messageId]` ou un placeholder « Transcription non disponible » si vide.
- Le bloc se met à jour automatiquement au changement de clip (`current` dérive de `index`).

## Hors périmètre

- Aucun changement de logique métier, de transcription, de modèle de données, ou de la page `SharedReport`.
