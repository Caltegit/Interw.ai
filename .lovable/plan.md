

## Correction du bug d'impersonation

### Le diagnostic

L'edge function `superadmin-impersonate` renvoie une erreur non-2xx quand on clique sur la flèche « Prendre la main ». La cause la plus probable : `admin.auth.admin.generateLink` échoue parce que l'URL `redirectTo` (basée sur l'`origin` de la requête, par ex. `https://id-preview--xxx.lovable.app/dashboard`) n'est pas dans la liste blanche des URL de redirection autorisées du projet Lovable Cloud.

Aucun log d'erreur détaillé n'est actuellement émis, ce qui empêche de confirmer à 100% — donc on corrige **ET** on ajoute des logs.

### La correction

**Fichier modifié : `supabase/functions/superadmin-impersonate/index.ts`**

1. **Ajouter du logging** sur chaque étape pour voir précisément où ça casse (vérification super admin, récupération user, génération du lien) — visible ensuite dans les logs edge functions.

2. **Rendre `redirectTo` optionnel et tolérant** : si `generateLink` échoue avec un `redirectTo`, faire un second essai sans `redirectTo`. Le lien magique tombera alors sur l'URL par défaut du site, ce qui suffit pour ouvrir une session.

3. **Renvoyer le message d'erreur Supabase** dans la réponse JSON (au lieu d'un message générique) pour que le toast côté front affiche la vraie cause.

**Fichier modifié : `src/pages/SuperAdminOrgDetail.tsx`**

4. **Garde-fou côté UI** : empêcher l'ouverture du `AlertDialog` quand le bouton est désactivé (le `disabled` sur l'enfant d'un `AlertDialogTrigger asChild` ne bloque pas toujours le clic). On déplace la condition sur le `AlertDialogTrigger` lui-même via un `onClick` qui appelle `e.preventDefault()` si l'utilisateur cible est l'utilisateur courant.

### Hors champ

- Pas de changement de la mécanique d'impersonation (toujours via magic link + retour avec `stopImpersonation`).
- Pas de modification de `src/lib/impersonation.ts` ni du bandeau orange.
- Si après correction l'erreur persiste à cause de la liste blanche des URL de redirection, on ajoutera l'URL preview Lovable dans la config auth dans un second temps.

