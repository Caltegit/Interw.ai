## Problème

Quand on invite `c@bap.fr` dans ALBO alors que cet email a déjà un compte (dans une autre organisation), la page `/invite/:token` propose toujours un formulaire « Créer mon compte ». L'appel `supabase.auth.signUp` échoue avec **« User already registered »** — sans solution proposée à l'utilisateur.

Le multi-organisation fonctionne côté base (table `organization_members` + RPC `accept_invitation` idempotente, qui ajoute l'appartenance sans écraser l'organisation principale). Le seul problème est l'écran d'invitation : il ne gère pas le cas « utilisateur existant ».

## Correctif (UI uniquement, fichier `src/pages/InviteSignup.tsx`)

1. **Détecter le cas « compte existant »** au chargement : appeler une petite fonction edge `check-invitation-account` (ou réutiliser `admin.auth.admin.getUserByEmail` côté serveur) qui retourne `{ exists: boolean }` pour l'email de l'invitation. Si l'edge function n'est pas souhaitée, on peut détecter à la soumission via le message d'erreur de `signUp` ("already registered") et basculer le formulaire.

2. **Adapter l'écran selon le résultat** :
   - **Email inconnu** → écran actuel inchangé (création de compte).
   - **Email déjà inscrit** → écran « Connectez-vous pour rejoindre **ALBO** » avec champ mot de passe + bouton **Se connecter**, qui appelle `supabase.auth.signInWithPassword`. Lien « Mot de passe oublié ? » vers `/reset-password`. Une fois connecté, le `useEffect` existant appelle déjà `accept_invitation` → l'utilisateur est ajouté à ALBO et redirigé sur `/dashboard`. Le `OrganizationSwitcher` du sidebar lui permettra ensuite de basculer entre ses organisations.

3. **Messages clairs en français** : 
   - Sous-titre : « Cet email possède déjà un compte Interw.ai. Connectez-vous pour rejoindre **ALBO**. »
   - Toast succès : « Vous avez rejoint ALBO. »

## Approche recommandée

Option **edge function `check-invitation-account`** (préférée) : appelée publiquement avec le `token`, vérifie côté serveur si l'email de l'invitation a déjà un compte auth et renvoie `{ exists }`. Évite de fuiter la liste des emails inscrits et permet d'afficher le bon écran dès le chargement (pas de tentative ratée de signup).

Fallback si l'utilisateur préfère minimal : intercepter l'erreur `User already registered` côté client et basculer vers le formulaire de connexion à la volée (1 seul fichier touché, pas de nouvelle edge function).

## Hors scope

- Pas de changement DB (les migrations multi-org existantes suffisent).
- Pas de changement du `OrganizationSwitcher` ni des autres pages.
