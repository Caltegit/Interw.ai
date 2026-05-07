## Objectif

Rendre la liste des sessions plus lisible et actionnable, en remplaçant l'état actuel (un seul onglet « Sessions », filtres cachés dans un popover) par des **vues rapides par statut** + des indicateurs visuels d'ancienneté pour repérer immédiatement ce qui demande une action.

## Problèmes actuels

1. Tout est dans une seule liste mélangée (en attente, en cours, terminé) → on ne voit pas d'un coup d'œil le pipeline
2. Le filtre statut est caché dans un popover « Filtres » → 2 clics pour isoler les en attente
3. Aucune indication d'**ancienneté** d'une session en attente (un lien envoyé il y a 1 jour ≠ il y a 15 jours)
4. Pas de vue dédiée aux sessions **complétées sans rapport** (cas Trichet / Christophe vu plus tôt)
5. Le bouton « Relancer » copie juste le lien → pas de trace de la dernière relance

## Améliorations proposées

### 1. Sous-onglets de statut au-dessus du tableau

Remplacer l'alerte + le filtre statut caché par une barre de **5 onglets visibles** avec compteur :

```text
[ Toutes 21 ] [ En attente 3 ] [ En cours 1 ] [ Terminées 15 ] [ À traiter 2 ]
```

- **À traiter** = statut `completed` mais sans rapport généré ou sans décision recruteur (`recruiter_decision = 'none'`) → met en avant ce qui demande une action RH
- L'onglet actif change `statusFilter` (logique déjà en place)
- Le badge compteur utilise les couleurs sémantiques (warning pour En attente, success pour Terminées, primary pour À traiter)

### 2. Colonne « Ancienneté » sur les sessions en attente

Dans la colonne Date, pour les sessions `pending`, afficher en plus un petit badge :
- **vert** : envoyée il y a < 3 jours
- **orange** : 3-7 jours
- **rouge** : > 7 jours (« Relance recommandée »)

Calcul basé sur `created_at`. Pas de nouvelle donnée DB.

### 3. Tri par défaut intelligent selon l'onglet

- Onglet **En attente** → tri par date de création **ancienne d'abord** (les plus urgentes à relancer remontent)
- Onglet **Terminées** / **À traiter** → tri par date récente (comportement actuel)
- Onglet **Toutes** → comportement actuel

### 4. Action « Relancer » améliorée

Le bouton Relancer copie aujourd'hui le lien. Garder ce comportement mais :
- Ajouter un menu déroulant : **Copier le lien** / **Renvoyer l'email d'invitation**
- L'option email réutilise la fonction existante `send-invitation` (déjà déployée)
- Toast de confirmation clair

### 5. Filtres restants simplifiés

Garder le popover « Filtres » uniquement pour : Recommandation, Score min/max, Plage de dates. Le statut sort du popover (devient les onglets). L'assignation reste un select séparé.

## Hors scope

- Notifications email automatiques de relance après X jours (prochaine étape)
- Modification du schéma DB (aucune nouvelle colonne)
- Export CSV de la liste (déjà demandé ailleurs ?)
- Refonte de la page entière — on reste sur la même structure de tableau

## Détails techniques

**Fichier impacté :** `src/pages/ProjectDetail.tsx` uniquement (frontend pur).

**Structure des onglets** : utiliser un nouveau composant local de type `ToggleGroup` shadcn ou simples `Button` avec variant `outline`/`default` selon l'onglet actif. Pas de routing — état local React (déjà via `statusFilter`).

**Calcul « À traiter »** :
```ts
const toReview = sessions.filter(s =>
  s.status === "completed" &&
  (!reportsBySession[s.id] || s.recruiter_decision === "none")
);
```

**Badge ancienneté** : helper local `getPendingAgeBadge(createdAt)` retournant `{ label, variant }`.

**Renvoi d'email** : appel à `supabase.functions.invoke("send-invitation", { body: { session_id: s.id } })` — vérifier que la fonction accepte ce payload, sinon adapter.

## Maquette ASCII

```text
[ Toutes 21 ] [En attente 3] [En cours 1] [Terminées 15] [À traiter 2]

Rechercher…    Toutes les sessions ▼   Filtres   Tri ▼            21/21
─────────────────────────────────────────────────────────────────────
Candidat              Statut       Score  Reco   Date              …
Yonas Mkharbeche      En attente   —      —      07/05  • 1j       Relancer ▼
Paris Olivier         En attente   —      —      02/05  • 5j ⚠     Relancer ▼
Richy-Dureteste       En attente   —      —      20/04  • 17j 🔴   Relancer ▼
```
