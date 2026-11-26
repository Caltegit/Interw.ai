# Migration Interw (Lovable) vers app.interw.com

## Organisations ayant reçu au moins un candidat (30 derniers jours)

| Organisation | Sessions créées | Entretiens terminés | Dernière session |
|---|---|---|---|
| Castalie | 298 | 100 | 24/11/2026 |
| Ads up | 110 | 80 | 26/11/2026 |
| Morning | 21 | 15 | 22/11/2026 |
| Tango | 1 | 0 | 18/11/2026 |

## Étape 1 (immédiate) : la page d'accueil renvoie vers la V2

- Le lien « Connexion » de la page d'accueil pointe vers `https://app.interw.com/login`.
- Les deux boutons « Commencer gratuitement » (haut et bas de page) pointent aussi vers `https://app.interw.com/login`, pour que plus aucun nouveau compte ne soit créé sur l'ancienne version.
- Rien d'autre ne change : les pages `/login`, `/signup`, le tableau de bord recruteur et toutes les pages candidats (`/session/...`) restent accessibles directement. Les clients actuels continuent à travailler normalement via leurs favoris.

Impact build : une seule page modifiée (page d'accueil), aucun changement de données ni de fonctions serveur. Visible en ligne uniquement après publication.

## Étape 2 : synchronisation des données vers la V2

- La V2 récupère les données via l'API d'export déjà en place (lecture seule, clé secrète) : organisations, membres, postes, questions, critères, sessions, transcriptions, rapports, liens vidéos signés 6 h.
- Ordre conseillé : Tango (test) puis Morning, Ads up, Castalie.
- Points à trancher avec la V2 : comptes utilisateurs (pas d'export des mots de passe : réinvitation ou lien magique), conversion des vidéos `.mov` d'iPhone en MP4, copie des vidéos chez la V2 avant toute coupure.

## Étape 3 : bascule progressive par organisation

- Geler la création de nouveaux postes sur l'ancienne version pour l'organisation migrée ; les entretiens en cours se terminent ici.
- Synchronisation finale des sessions terminées, puis bannière dans l'espace recruteur : « Votre espace est désormais sur app.interw.com ».
- Les liens candidats déjà envoyés restent valides jusqu'à la date limite des postes.

## Étape 4 : fermeture

- Quand plus aucune session n'est en cours (≥ 30 jours sans activité), redirection de `/login` et du tableau de bord vers la V2, puis pages candidats.
- Garder l'API d'export et le stockage vidéo actifs quelques mois en lecture, puis réduire les ressources serveur pour baisser la consommation de crédits.

## Détails techniques (étape 1)

- `src/pages/Landing.tsx` lignes 142, 175, 304 : remplacer les `<Link to=...>` par des `<a href="https://app.interw.com/login">`.
- Aucune redirection automatique, aucune modification des routes.
