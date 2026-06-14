## Modification

Dans `supabase/functions/_shared/transactional-email-templates/candidate-abandon-reminder.tsx`, supprimer le bloc final affiché dans la capture :

- Le `<Hr />`
- La `<Section style={footer}>` contenant :
  - « Interw — Plateforme d'entretien assistée par IA »
  - « interw · contact@interw.ai »

Le reste de l'email (salutation, message, bouton « Reprendre l'entretien », lien de secours, signature « À bientôt, L'équipe Interw ») reste inchangé.

## Déploiement

Redéployer la fonction `send-transactional-email` pour que la nouvelle version du template soit utilisée.
