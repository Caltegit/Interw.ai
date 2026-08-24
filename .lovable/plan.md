# Lot B — Page Système unifiée

## Passage 1 : création, aucune suppression

Nouvelle page `src/pages/AdminSystem.tsx`, protégée par `SuperAdminRoute`, avec des onglets shadcn `Tabs` sur le même pattern que la console Super Admin :

```text
Système
[ Emails ] [ File des sessions ]
```

- L'onglet actif est lu et écrit dans l'URL via `useSearchParams` : `/admin/system?tab=sessions`. Sans paramètre, `emails` par défaut.
- Le contenu de `AdminEmails.tsx` et `AdminSessionsQueue.tsx` est réutilisé tel quel : les deux composants existants sont rendus dans leur onglet respectif, sans réécriture ni modification de leur logique.

## Routes

| URL | Comportement |
|---|---|
| `/admin/system` | nouvelle page à onglets |
| `/admin/emails` | redirige vers `/admin/system?tab=emails` |
| `/admin/sessions-queue` | redirige vers `/admin/system?tab=sessions` |

L'entrée « Système » du dropdown du bouton compte pointe désormais vers `/admin/system`.

Les fichiers `AdminEmails.tsx` et `AdminSessionsQueue.tsx` restent en place à ce stade.

## À vérifier

1. `/admin/system` s'ouvre sur l'onglet Emails, avec stats, filtres, tableau et bouton Réessayer identiques à avant.
2. Clic sur « File des sessions » : l'URL devient `?tab=sessions`, le contenu s'affiche. Rechargement de la page : on revient sur le bon onglet.
3. `/admin/emails` et `/admin/sessions-queue` redirigent vers le bon onglet.
4. Dropdown compte → Système ouvre `/admin/system`.
5. En compte non super admin, `/admin/system` renvoie au dashboard.

## Passage 2 — après ton feu vert

Suppression de `src/pages/AdminEmails.tsx` et `src/pages/AdminSessionsQueue.tsx` une fois les onglets validés (leur contenu aura alors été déplacé dans des composants d'onglet).

## Détails techniques

- Crée : `src/pages/AdminSystem.tsx`.
- Modifie : `src/App.tsx` (route + 2 redirections `Navigate`), `src/components/AppSidebar.tsx` (cible du lien Système).
- Aucune nouvelle dépendance, aucun changement de schéma ni de logique métier.
