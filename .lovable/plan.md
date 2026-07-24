## Ce que je peux affirmer après vérification

Tu as raison : ma version précédente allait trop loin. Je ne peux pas affirmer que tu as volontairement changé ton email super admin en Justine. Ce que la base montre aujourd'hui, en revanche, est clair :

- Le `user_id` historique `0af28056...` a été créé le **02/07 à 13:28 UTC**.
- Ce même `user_id` porte maintenant :
  - email : `justine@centreviasana.com`
  - nom : `Justine Sagot`
  - rôle global : `super_admin`
  - rôle ALBO : `admin` + `member`
  - rôle Via Sana : `admin` + `member`
  - voix clonée : `Eva`, créée le 15/07
- Le `user_id` `a519ef85...` porte maintenant :
  - email : `eva@alboteam.com`
  - nom : `Eva Danel`
  - créé le **24/07 à 08:29 UTC**
  - rôle global : `super_admin`
  - rôle ALBO : `admin` + `member`
  - rôle Via Sana : `member`
- L'organisation **Via Sana** a été créée le **24/07 à 08:07 UTC** avec `owner_id = 0af28056...`.

Les heures que j'ai données viennent directement des colonnes `created_at` en base, en **UTC**. En heure française, ça correspond à environ **10:07** et **10:29**.

## Cause probable corrigée

Le scénario le plus cohérent avec ce que tu décris est celui-ci :

1. Tu as créé Via Sana avec toi comme propriétaire initiale.
2. Ensuite tu as voulu remplacer le propriétaire par Justine.
3. L'interface / logique actuelle mélange deux notions différentes :
   - **changer le propriétaire d'une organisation**
   - **modifier l'email du compte utilisateur propriétaire**
4. La fonction backend `superadmin-manage-user`, action `update_profile`, permet de changer l'email d'un utilisateur global via :
   - mise à jour de l'email d'authentification
   - mise à jour de `profiles.email`
5. Résultat probable : au lieu de transférer proprement `organizations.owner_id` vers un nouveau compte Justine, le système a modifié l'identité du compte propriétaire existant (`0af28056...`).

Donc le problème n'est pas forcément une action manuelle de ta part sur ton profil : c'est probablement une **confusion fonctionnelle entre “propriétaire d'organisation” et “compte utilisateur”**.

## À vérifier avant toute réparation

Je veux valider les traces d'action exactes avant de toucher aux données :

1. Lire les logs récents des fonctions backend liées à :
   - création d'organisation
   - création utilisateur
   - modification utilisateur
   - lien magique / prise en main
2. Vérifier si un vrai compte auth séparé pour `justine@centreviasana.com` a été créé puis réattaché, ou si seul le compte `0af28056...` a changé d'identité.
3. Vérifier les accès actuels de Justine : ALBO, Via Sana, super admin, propriété org.
4. Vérifier les accès actuels d'Eva : ALBO, super admin, Via Sana.

## Réparation proposée

Objectif : revenir à une séparation propre.

### Eva
- Garder `a519ef85...` comme compte Eva actuel si c'est celui qui porte maintenant `eva@alboteam.com`.
- Confirmer qu'il a bien :
  - `super_admin`
  - `admin` + `member` ALBO
- Retirer son rattachement à Via Sana si tu ne dois pas y être membre.

### Justine
- Faire en sorte que `justine@centreviasana.com` soit un compte client propre, sans héritage ALBO ni super admin.
- Retirer de ce compte :
  - `super_admin`
  - `admin` ALBO
  - `member` ALBO
- Le garder uniquement dans Via Sana, idéalement :
  - propriétaire Via Sana
  - admin Via Sana
  - membre Via Sana

### Via Sana
- `organizations.owner_id` doit pointer vers le vrai compte Justine.
- Les membres Via Sana doivent être uniquement ceux voulus.

### Session navigateur
- Forcer une déconnexion/reconnexion après correction, car ton navigateur peut garder un jeton encore lié au mauvais `user_id`.

## Garde-fous à ajouter

### Backend
Dans `superadmin-manage-user` :
- Interdire le changement d'email d'un utilisateur `super_admin`.
- Interdire le changement d'email de son propre compte via la console super admin.
- Interdire le changement d'email d'un utilisateur propriétaire d'organisation sans procédure dédiée.
- Avant toute modification d'email, vérifier qu'il n'existe pas déjà un autre compte avec cet email.

### Interface
Dans `EditUserDialog` :
- Ne plus présenter le changement d'email comme une opération banale.
- Masquer ou bloquer le champ email pour :
  - soi-même
  - super admins
  - propriétaires d'organisation
- Ajouter une action séparée : **Transférer la propriété**, qui change `organizations.owner_id` sans modifier l'email du compte source.

### Audit
Créer une table d'audit admin pour tracer :
- qui a fait l'action
- quel compte a été ciblé
- ancien email
- nouvel email
- organisation concernée si applicable
- date

## Ordre d'exécution

1. Vérifier les logs et compléter la chronologie.
2. Corriger les données Eva / Justine / Via Sana.
3. Ajouter les garde-fous backend.
4. Ajouter les garde-fous UI.
5. Ajouter l'audit.
6. Vérifier en base :
   - Justine n'a plus ALBO ni super admin.
   - Eva garde ALBO + super admin.
   - Via Sana a le bon propriétaire.
