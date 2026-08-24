# Passage 2 — suppression des anciennes pages

## Test navigateur effectué (super admin, navigateur réel)

| Adresse ouverte | URL finale observée | Onglet actif |
|---|---|---|
| `/admin/emails` | `/admin/system?tab=emails` | Emails |
| `/admin/sessions-queue` | `/admin/system?tab=sessions` | File des sessions |
| `/admin/system?tab=sessions` (accès direct) | `/admin/system?tab=sessions` | File des sessions |

Les trois cas passent. Le paramètre est bien présent dans l'URL réelle ; la barre d'adresse de l'aperçu Lovable n'affiche que le chemin, d'où l'impression qu'il disparaissait.

## Ce que fait le passage 2

- Suppression de `src/pages/AdminEmails.tsx` et `src/pages/AdminSessionsQueue.tsx` (devenus de simples coquilles, plus référencés que par leurs imports).
- Suppression des deux imports correspondants dans `src/App.tsx`.
- Les redirections `/admin/emails` et `/admin/sessions-queue` restent en place, inchangées.

Rien d'autre ne bouge : `AdminSystem.tsx`, `EmailsTab.tsx` et `SessionsQueueTab.tsx` sont conservés tels quels, aucune logique métier n'est touchée.

## Vérification après suppression

- Contrôle de type sur le projet, plus aucune référence aux deux fichiers supprimés.
- Nouveau passage navigateur sur les trois adresses du tableau ci-dessus pour confirmer un comportement identique.
