# Inscription libre + refonte UI de la connexion

## Ce qu'on construit

1. Une page publique `/signup` (bloc shadcn `signup-03`) : nom, email, mot de passe, confirmation d'email obligatoire.
2. Une page `/login` reprenant la mise en page du bloc `login-03`, sans changer la logique existante (connexion + mot de passe oublié par code à 6 chiffres).
3. Une étape d'accueil après la première connexion : le nouvel inscrit saisit le nom de son entreprise, son organisation est créée, il en devient propriétaire avec ses 10 entretiens offerts.
4. Tous les boutons « Commencer gratuitement » pointent vers `/signup`, tous les « Se connecter » vers `/login`. Les boutons « Réserver une démo » restent inchangés.

## État actuel constaté

- Il n'existe aucune inscription libre : seule `/invite/:token` permet de créer un compte, et les organisations sont créées par l'équipe (Super Admin) ou via invitation.
- Aujourd'hui « Commencer gratuitement » (hero + bas de page), les boutons des cartes tarifaires et « Se connecter » renvoient tous vers `/login`.
- À la création d'un compte, la base crée uniquement un profil ; le rattachement à une organisation se fait au moment de la confirmation d'email, et uniquement s'il existe une invitation en attente. Sans invitation, le nouvel utilisateur se retrouve donc **sans organisation** — d'où l'étape d'accueil ci-dessus, sans laquelle le tableau de bord serait vide et cassé.

## Parcours cible

```text
Landing "Commencer gratuitement"
   -> /signup (nom, email, mot de passe)
   -> écran "Vérifiez votre boîte mail"
   -> lien de confirmation
   -> si invitation en attente : rattachement automatique à l'organisation (comportement actuel)
   -> sinon : /bienvenue (nom de l'entreprise) -> organisation créée -> /dashboard
```

## Détails techniques

**Pages**
- `src/pages/Signup.tsx` (nouveau) : structure visuelle du bloc shadcn `signup-03`, sans bouton social. `supabase.auth.signUp` avec `emailRedirectTo: ${window.location.origin}/dashboard`, validation de mot de passe réutilisée depuis `InviteSignup`, `normalizeEmail`, message générique si l'email existe déjà + lien vers `/login`.
- `src/pages/Login.tsx` : refonte visuelle uniquement (structure `login-03`), logique `signInWithPassword` et mode « mot de passe oublié » conservées, ajout du lien « Pas encore de compte ? Créer un compte ».
- `src/pages/Onboarding.tsx` (nouveau, route `/bienvenue`) : un champ « Nom de l'entreprise », appelle la fonction serveur de création d'organisation puis redirige vers `/dashboard`.
- `src/App.tsx` : routes publiques `/signup`, protégée `/bienvenue`.
- `src/components/ProtectedRoute.tsx` : si connecté et profil sans organisation et pas d'invitation en attente -> redirection vers `/bienvenue`.

**Base de données (une migration)**
- Fonction `create_own_organization(_name text)` en `security definer` : refuse si l'utilisateur a déjà une organisation, crée l'organisation (slug, `owner_id`), l'entrée `organization_members`, met à jour `profiles.organization_id`, insère le rôle `admin` dans `user_roles`, initialise les crédits offerts, puis appelle les fonctions de seed déjà existantes (modèles de questions, critères, intros, poste de démonstration) — exactement ce que fait déjà le parcours propriétaire via invitation.

**Réglages d'authentification**
- Inscriptions ouvertes, confirmation d'email obligatoire, comptes anonymes désactivés, vérification des mots de passe compromis activée.

**Traductions**
- Nouvelles clés FR/EN pour les deux pages et l'écran d'accueil ; les libellés existants « Commencer gratuitement » / « Se connecter » sont réutilisés tels quels.

**Liens à rebrancher** (`src/pages/Landing.tsx`, `src/pages/Produit.tsx`)
- Hero et bas de page « Commencer gratuitement » -> `/signup`.
- Boutons des cartes tarifaires (hors Entreprise, qui garde la démo) -> `/signup`.
- En-têtes « Se connecter » -> `/login` (inchangé).

## Risques et points de vigilance

- **Ouverture des inscriptions** : n'importe qui pourra créer un compte et une organisation. Mitigations : confirmation d'email obligatoire, crédits limités à 10 entretiens, et suivi possible des nouvelles organisations dans Super Admin.
- **Collision invitation / inscription libre** : si un invité s'inscrit d'abord par `/signup`, la confirmation d'email le rattache automatiquement à l'organisation qui l'a invité (logique existante) et l'écran d'accueil est alors sauté. Cas couvert par la condition de redirection.
- **Utilisateurs existants sans organisation** : ils seraient désormais envoyés vers `/bienvenue`. Je vérifie ce nombre avant, et j'exclus les comptes internes si besoin.
- **Emails de confirmation** : ils passent par le système d'emails actuel ; si le volume augmente, la limite horaire d'envoi peut devoir être relevée.
- **Ce qui ne bouge pas** : `/invite/:token`, la réinitialisation de mot de passe par code, les liens magiques, le parcours candidat.

## Étapes

1. Migration : fonction de création d'organisation.
2. Réglages d'authentification.
3. Page `/signup` + refonte visuelle de `/login` + page `/bienvenue` + routes et garde.
4. Rebranchement des boutons de la landing et de la page produit + traductions.
5. Test bout en bout : inscription, confirmation, création d'organisation, arrivée sur le tableau de bord.
