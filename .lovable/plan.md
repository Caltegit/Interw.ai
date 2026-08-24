# Lot B — Page Système unifiée

## Passage 1 : création, aucune suppression

Option retenue : **extraction du contenu vers des composants d'onglet**.

- `src/components/admin/EmailsTab.tsx` reçoit le corps de `AdminEmails.tsx` (états, `load`, stats, filtres, tableau, pagination, bouton Réessayer) sans changement de logique.
- `src/components/admin/SessionsQueueTab.tsx` reçoit de la même façon le corps de `AdminSessionsQueue.tsx`, polling inclus.
- Dans chaque composant extrait, on retire uniquement l'en-tête de page (titre + sous-titre + icône) et le padding de page ; le reste est identique.
- `AdminEmails.tsx` et `AdminSessionsQueue.tsx` deviennent des coquilles qui rendent simplement leur composant d'onglet, le temps que tu valides. Elles ne sont plus référencées ailleurs après le passage 1, donc leur suppression au passage 2 ne casse aucun import.

Nouvelle page `src/pages/AdminSystem.tsx`, protégée par `SuperAdminRoute`, avec un titre unique « Système » en haut et des onglets shadcn `Tabs` sur le même pattern que la console Super Admin :

```text
Système
[ Emails ] [ File des sessions ]
```

- L'onglet actif est lu et écrit dans l'URL via `useSearchParams` : `/admin/system?tab=sessions`. Sans paramètre, `emails` par défaut.
- Seul l'onglet actif est monté : `TabsContent` de Radix démonte le contenu inactif, donc aucune requête ni polling de la file des sessions ne part tant que l'onglet Emails est affiché (et inversement).

## Routes

| URL | Comportement |
|---|---|
| `/admin/system` | nouvelle page à onglets |
| `/admin/emails` | redirige vers `/admin/system?tab=emails` |
| `/admin/sessions-queue` | redirige vers `/admin/system?tab=sessions` |

L'entrée « Système » du dropdown du bouton compte pointe désormais vers `/admin/system`.

## À vérifier

1. `/admin/system` s'ouvre sur l'onglet Emails, avec stats, filtres, tableau et bouton Réessayer identiques à avant.
2. Un seul titre « Système » en haut : aucun titre de page dupliqué à l'intérieur des onglets.
3. Au chargement sur Emails, aucune requête de la file des sessions ne part (onglet réseau : rien de la file, pas de polling). Idem en sens inverse.
4. Clic sur « File des sessions » : l'URL devient `?tab=sessions`, le contenu s'affiche. Rechargement de la page : on revient sur le bon onglet.
5. `/admin/emails` et `/admin/sessions-queue` redirigent vers le bon onglet.
6. Dropdown compte → Système ouvre `/admin/system`.
7. En compte non super admin, `/admin/system` renvoie au dashboard.

## Passage 2 — après ton feu vert

Suppression des deux fichiers de page devenus des coquilles : `src/pages/AdminEmails.tsx` et `src/pages/AdminSessionsQueue.tsx`, ainsi que leurs imports et anciennes définitions de route résiduelles dans `src/App.tsx` (les redirections restent).

## Détails techniques

- Crée : `src/pages/AdminSystem.tsx`, `src/components/admin/EmailsTab.tsx`, `src/components/admin/SessionsQueueTab.tsx`.
- Modifie : `src/pages/AdminEmails.tsx` et `src/pages/AdminSessionsQueue.tsx` (réduites à des coquilles), `src/App.tsx` (route + 2 redirections `Navigate`), `src/components/AppSidebar.tsx` (cible du lien Système).
- Aucune nouvelle dépendance, aucun changement de schéma ni de logique métier.
