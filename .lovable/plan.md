# Plan A1 — Ignorer et documenter le finding `PUBLIC_SENSITIVE_DATA` sur `organizations`

## Objectif
Débloquer la publication en marquant comme "ignoré" un finding du scanner de sécurité qui est un faux positif, sans toucher au code ni à la base de données.

## Contexte
Le scanner remonte une erreur `PUBLIC_SENSITIVE_DATA` sur la table `organizations` en se basant sur la policy RLS `Anon can read public org fields`. Cette policy autorise en effet la lecture pour les utilisateurs anonymes, mais la migration du 8 juillet a mis en place une protection **au niveau colonne** : les rôles `anon` et `authenticated` n'ont un `GRANT SELECT` que sur `id`, `name`, `slug`, `logo_url`, `created_at`. Les colonnes sensibles (`client_notes`, `pricing`, `owner_id`, crédits…) ne sont donc pas accessibles via l'API publique, malgré ce que suggère le scanner.

## Étapes

1. **Ignorer le finding**
   - Appel de l'outil de gestion des findings avec `operation: "ignore"` sur `PUBLIC_SENSITIVE_DATA` / `organizations`.
   - Explication enregistrée : faux positif — protection assurée par les `GRANT` colonne-par-colonne posés le 8 juillet, les colonnes sensibles ne sont pas exposées à `anon`.

2. **Mettre à jour la mémoire sécurité**
   - Documenter que la lecture anonyme de `organizations` est intentionnelle et limitée aux 5 colonnes publiques (`id`, `name`, `slug`, `logo_url`, `created_at`), nécessaire pour la page publique d'organisation et les pages publiques de projet.
   - Ajouter une règle : toute nouvelle colonne ajoutée à `organizations` doit être explicitement exclue des `GRANT` accordés à `anon` / `authenticated`, sinon elle deviendrait publique.
   - Rappeler que la policy RLS `Anon can read public org fields` est volontaire et complémentaire des grants colonne.

3. **Republier**
   - Une fois le finding ignoré, la publication n'est plus bloquée. L'utilisateur peut cliquer sur "Publier" pour pousser les changements frontend (UI critères) en production.

## Ce qui n'est PAS modifié
- Aucun fichier applicatif.
- Aucune policy RLS.
- Aucun `GRANT`.
- Aucune donnée.
- Aucun redéploiement d'edge function ni migration.

## Risques
- Nul côté runtime : rien ne change dans l'app.
- Résiduel : si un futur développeur ajoute une colonne sensible à `organizations` sans mettre à jour les grants, le scanner ne re-signalera pas ce cas particulier. La règle ajoutée dans la mémoire sécurité vise précisément à alerter les prochains agents sur ce point.
