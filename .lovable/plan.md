# Migration Interw (Lovable) vers app.interw.com

## Organisations ayant reçu au moins un candidat (30 derniers jours)

| Organisation | Sessions créées | Entretiens terminés | Dernière session |
|---|---|---|---|
| Castalie | 298 | 100 | 24/11/2026 |
| Ads up | 110 | 80 | 26/11/2026 |
| Morning | 21 | 15 | 22/11/2026 |
| Tango | 1 | 0 | 18/11/2026 |

## État de la V1 (toutes périodes)

- 3 510 entretiens au total : 1 497 terminés, 88 en cours, 1 696 invitations jamais commencées.

## Vérification des liens V2

- `https://app.interw.com/login` : page réelle « Sign in or sign up · Interw » (OK, mais titre en anglais).
- `https://app.interw.com/signup` : n'existe pas (404). On renvoie donc tous les boutons vers `/login`.

## Étape 1 (aujourd'hui) : la page d'accueil renvoie vers la V2

- Le lien « Connexion » de la page d'accueil pointe vers `https://app.interw.com/login`.
- Les deux boutons « Commencer gratuitement » (haut et bas de page) pointent aussi vers `https://app.interw.com/login`, pour que plus aucun nouveau compte ne soit créé sur l'ancienne version.
- Rien d'autre ne change : les pages `/login`, `/signup`, le tableau de bord recruteur et toutes les pages candidats (`/session/...`) restent accessibles directement. Les clients actuels continuent à travailler normalement via leurs favoris.

### Gel de la création de postes (dès aujourd'hui)
- Le bouton « Nouveau poste » et la duplication de poste sont désactivés pour toutes les organisations, avec le message : « La création de postes se fait désormais sur app.interw.com ».
- Les postes existants restent modifiables ; les invitations et entretiens continuent.

### Bandeau de migration côté recruteur
- Bandeau fixe en haut de l'espace recruteur : « Interw déménage sur app.interw.com. Vos nouveaux postes se créent là-bas. » avec un bouton « Ouvrir la nouvelle version ».
- Jamais affiché aux candidats.

Impact build : page d'accueil, liste des postes et mise en page recruteur modifiées (page d'accueil), aucun changement de données ni de fonctions serveur. Visible en ligne uniquement après publication.

## Étape 2 : synchronisation des données vers la V2

- La V2 récupère les données via l'API d'export déjà en place (lecture seule, clé secrète) : organisations, membres, postes, questions, critères, sessions, transcriptions, rapports, liens vidéos signés 6 h.
- Toutes les organisations sont migrées (56 au total, dont 25 avec au moins un entretien), pas seulement les 4 actives sur 30 jours.
- Ordre conseillé : les organisations sans activité récente et les comptes de test d'abord (import en bloc), puis Tango, ALBO, Morning, Ads up et Castalie (actives, migration accompagnée).
- Points à trancher avec la V2 : comptes utilisateurs (pas d'export des mots de passe : réinvitation ou lien magique), conversion des vidéos `.mov` d'iPhone en MP4, copie des vidéos chez la V2 avant toute coupure.

## Étape 3 : bascule progressive par organisation

- Geler la création de nouveaux postes sur l'ancienne version pour l'organisation migrée ; les entretiens en cours se terminent ici.
- Synchronisation finale des sessions terminées, puis bannière dans l'espace recruteur : « Votre espace est désormais sur app.interw.com ».
- Les liens candidats déjà envoyés restent valides jusqu'à la date limite des postes.

## Étape 4 : fermeture

- Quand plus aucune session n'est en cours (≥ 30 jours sans activité), redirection de `/login` et du tableau de bord vers la V2, puis pages candidats.
- Garder l'API d'export et le stockage vidéo actifs quelques mois en lecture, puis réduire les ressources serveur pour baisser la consommation de crédits.

## Migration des adresses (V2 sur interw.com à terme)

- Aujourd'hui : interw.com, www.interw.com et interw.ai pointent sur la V1 ; app.interw.com sur la V2.
- Les liens candidats déjà envoyés sont de la forme `interw.com/session/...` : ils doivent continuer à fonctionner après la bascule.
- Étapes :
  1. La V2 prévoit une route `/session/<lien>` qui renvoie les anciens liens vers `v1.interw.com/session/<lien>` tant que le poste V1 est ouvert.
  2. Ajouter `v1.interw.com` comme domaine de la V1 (en plus des actuels).
  3. Le jour J : interw.com et www pointent sur la V2 ; interw.ai redirige vers interw.com.
  4. Ensuite, app.interw.com redirige vers interw.com (ou reste l'adresse de l'application, à décider avec la V2).
- Attention : l'adresse de connexion (Google, e-mails d'invitation et de mot de passe) de la V1 doit passer sur v1.interw.com avant le jour J.

## Calendrier conseillé

| Quand | Action |
|---|---|
| Semaine 1 (26/11) | Page d'accueil vers V2, gel des postes, bandeau recruteur, publication |
| Semaines 1-2 | Import Tango et Morning en V2 via l'API d'export, validation |
| Semaines 2-3 | Import Ads up puis Castalie ; recruteurs basculés organisation par organisation |
| Semaine 4 (≈ 21/12) | Ajout de v1.interw.com, route de renvoi des anciens liens en V2 |
| Janvier 2027 | interw.com passe sur la V2 (période calme après les fêtes) |
| Février 2027 | Plus de session V1 active : redirection complète, V1 en lecture seule |
| Avril 2027 | Archivage des vidéos, réduction des ressources V1 |

## Détails techniques (étape 1)

- `src/pages/Landing.tsx` lignes 142, 175, 304 : remplacer les `<Link to=...>` par des `<a href="https://app.interw.com/login">`.
- Gel : désactiver la création/duplication dans la page Postes et bloquer `/projects/new`.
- Bandeau : ajouté dans la mise en page recruteur protégée.
- Aucune redirection automatique, aucune modification des routes candidats.
