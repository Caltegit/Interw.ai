## Objectif

Ajouter le choix du « Répondre à » dans la pop-up de partage des rapports, pour que l'utilisateur puisse choisir entre :
- pas de réponse possible (no-reply, par défaut désactivé)
- son propre email de compte (par défaut quand le toggle est activé)
- un autre email saisi manuellement

## Modifications

Dans `src/components/project/ShareReportsDialog.tsx` :

1. Ajouter un toggle (Switch) « Autoriser une réponse »
   - Désactivé = no-reply (aucun `replyTo` envoyé)
   - Activé = un champ email apparaît, pré-rempli avec l'email du compte connecté (`user.email`), modifiable

2. Validation : si le toggle est activé, valider le format de l'email avant envoi

3. Passer `replyTo` dans le `templateData` / body de l'appel `supabase.functions.invoke("send-transactional-email", ...)` uniquement si le toggle est activé

## Backend

Aucun changement nécessaire : la fonction `send-transactional-email` accepte déjà le paramètre `replyTo`.