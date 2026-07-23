## Bug A uniquement — statut à 4 valeurs pour les reinvitations

Scope réduit comme demandé : je ne touche PAS au rattachement implicite (Bug B bis abandonné). Uniquement le badge trompeur sur la ligne principale et dans l'historique déplié.

### Cause exacte

Dans `src/pages/AdminCandidatesToRecover.tsx` :

```ts
const lastFailed =
  r.lifecycle === "resent" && lastInv?.new_session_id && !isReinvitationSuccessful(lastInv);
```

`isReinvitationSuccessful` retourne `false` dès que la nouvelle session n'est pas `completed` — donc une session `pending` / `video_viewed` / `in_progress` (le candidat n'a pas encore ouvert ou est en cours) déclenche à tort le badge orange **"Reprise re-cassée"**. C'est exactement ce que tu as vécu sur ta session témoin.

Même erreur dans l'historique déplié (ligne 562) : le fallback `"En attente"` n'apparaît que si `new_session_status !== "completed"`, mais `cancelled` / `expired` sont eux aussi rangés dans "En attente" alors qu'ils sont morts. Petit défaut symétrique, corrigé en même temps.

### Ce que je change

Une seule fonction utilitaire `getReinvitationStatus(inv): "sending" | "pending" | "success" | "failed"` :

- **`sending`** — pas de `new_session_id` → badge neutre **"Lien envoyé"**
- **`pending`** — `new_session_status ∈ { pending, video_viewed, in_progress }` → badge neutre **"En attente de reprise"**
- **`success`** — `completed` + exploitable (via `isReinvitationSuccessful`) → badge vert **"Reprise réussie"** (inchangé)
- **`failed`** — `completed` mais inutilisable, OU `cancelled` / `expired` → badge orange **"Reprise KO"**

Deux points d'utilisation :

1. **Ligne principale** (col Statut, lifecycle `resent`) : remplacer `lastFailed` par le statut de la dernière reinvitation. N'afficher un sous-badge que si `pending` (neutre) ou `failed` (**"Reprise KO"**, plus "re-cassée"). Rien affiché pour `sending` ou `success` (déjà couvert par le badge principal).
2. **Historique déplié** : remplacer le if/else en cascade par un switch sur ce même statut. Corrige au passage le cas `cancelled`/`expired` mal étiqueté "En attente".

`isReinvitationSuccessful` et `computeLifecycle` restent **strictement inchangées** — donc `repassed` ne se déclenche toujours que si ≥ 1 reprise `success`, et les compteurs header (`À renvoyer` / `Déjà renvoyée` / `Session repassée`) ne bougent pas d'un pouce.

### Ce qui peut casser dans l'existant — audit honnête

- **Compteurs header** : dépendent uniquement de `lifecycle`. Non touchés. Zéro risque.
- **Filtres cycle de vie + motif** : dépendent de `lifecycle` et `reason`. Non touchés. Zéro risque.
- **Bouton "Renvoyer"** : sa condition d'affichage (`lifecycle !== "repassed"`) est inchangée. Une origine avec reprise `pending` reste "Renvoyer à nouveau" comme aujourd'hui — cohérent, on peut vouloir relancer un candidat qui n'a pas encore ouvert.
- **RPC `admin_list_recoverable_candidates`** : non touchée. Aucun changement DB.
- **Edge function `resend-impacted-candidate`** : non touchée.
- **Ligne d'Eva (ta session témoin)** : si elle est encore visible, son badge "Reprise re-cassée" disparaît immédiatement et devient "En attente de reprise" pour S2/S4 (pending).

### Incertitudes résiduelles

- **`new_session_status` peut valoir d'autres choses** (`cancelled_partial` par ex.). Toute valeur inconnue tombe dans le bucket `failed` par défaut — safe, un cas imprévu s'affiche en "Reprise KO" plutôt qu'en faux "En attente".
- **Aucun test e2e** ne couvre cette page à ma connaissance ; validation manuelle sur la page `/admin/candidates-to-recover` après build (screenshot d'une ligne `resent` avec new_session `pending` = badge neutre, screenshot d'une ligne `resent` avec new_session `completed` inutilisable = "Reprise KO").

### Livrables

- Édition unique de `src/pages/AdminCandidatesToRecover.tsx` :
  - Ajout de `getReinvitationStatus(inv)`.
  - Ligne 478-479 : `lastFailed` → statut typé.
  - Ligne 508-517 (col Statut ligne principale) : badge conditionnel selon statut.
  - Ligne 560-566 (historique déplié) : switch sur statut.
  - Remplacement du wording "Re-cassée" par "Reprise KO".
- Aucune migration, aucune edge function, aucun changement ailleurs.