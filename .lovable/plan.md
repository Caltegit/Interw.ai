## Pop-up de confirmation après envoi du lien magique

### Contexte

Sur `src/pages/Login.tsx` (mode "forgot"), après clic sur "Envoyer", on affiche actuellement un simple toast. Le remplacer par une vraie modale plus visible et rassurante.

### Changement

Dans `src/pages/Login.tsx` :
- Ajouter un state `showSentDialog`.
- En mode `forgot`, après succès de `signInWithOtp`, ouvrir une `<AlertDialog>` (shadcn) au lieu du toast.
- Contenu de la modale :
  - **Titre** : "Vérifiez votre boîte mail"
  - **Description** :
    - "Si un compte existe pour **{email}**, vous allez recevoir un email contenant un **lien de connexion automatique**. Cliquez dessus pour vous connecter directement, sans mot de passe."
    - "Le lien est valable 24h et utilisable une seule fois."
    - "**Pensez à vérifier vos spams** si vous ne voyez pas l'email d'ici quelques minutes."
  - **Action** : bouton "J'ai compris" qui ferme la modale et revient sur `mode=login`.
- Garder le toast d'erreur existant en cas d'échec.

Aucun changement backend, ni sur `MagicLink.tsx`, ni sur les autres pages.
