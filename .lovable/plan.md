## Objectif
Ajouter au dialogue « Envoyer un email aux candidats sélectionnés » (`BulkEmailDialog`) la même section « Autoriser une réponse » que dans `ShareReportsDialog`, avec un switch et un champ email pré-rempli avec l'email de l'utilisateur connecté.

## Modifications dans `src/components/project/BulkEmailDialog.tsx`

1. Importer `useAuth` depuis `@/contexts/AuthContext` et `Switch` depuis `@/components/ui/switch`.
2. Ajouter deux états : `allowReply` (bool, défaut `true`) et `replyTo` (string).
3. Pré-remplir `replyTo` avec `user.email` à l'ouverture du dialogue.
4. Insérer le bloc UI (switch + input email conditionnel) entre l'objet et le message, copié du style de `ShareReportsDialog`.
5. Dans `handleSend` :
   - Valider l'adresse `replyTo` si `allowReply` est actif (toast d'erreur sinon).
   - Ajouter `replyTo: replyToTrimmed` dans le `body` de chaque appel `supabase.functions.invoke('send-transactional-email', ...)` quand `allowReply` est vrai.

Aucun changement côté Edge Function — `send-transactional-email` accepte déjà le champ `replyTo` (utilisé par `ShareReportsDialog`).
