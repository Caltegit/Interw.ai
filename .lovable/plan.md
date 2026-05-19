## Constats

- Les données ne sont pas perdues : j’ai vérifié en base, **ALBO a 205 sessions** et **Morning en a 3**.
- Ce n’est donc **pas** un problème de suppression de sessions.
- Le point le plus suspect est l’interface : dans `ProjectDetail.tsx`, la liste affichée est construite à partir de `readySessions`, donc **uniquement les sessions terminées avec rapport**.
- Concrètement, le code charge bien `sessions`, mais l’affichage final fait ensuite :

```text
sessions -> readySessions (completed + report)
         -> filteredSessions = readySessions.slice()
         -> rendu de la table/cartes
```

- Si les rapports ne remontent pas, ou si l’utilisateur attend de voir aussi les sessions en cours / en attente, la page peut donner l’impression que **tout a disparu**.
- Revenir en arrière sur la migration RLS n’est **pas** la bonne option à ce stade : on réintroduirait la fuite de données entre organisations alors que les sessions existent toujours.

## Plan de correction

### 1. Vérifier précisément le flux d’affichage côté RH
- Contrôler la route exacte utilisée quand vous ouvrez “les sessions”.
- Vérifier si le vide vient :
  - de la page **liste des projets**,
  - de la page **détail d’un projet**,
  - ou d’une **vue super admin d’organisation**.
- Relever les réponses réelles des requêtes `sessions` et `reports` dans l’interface pour confirmer si les sessions sont chargées mais ensuite filtrées à l’écran.

### 2. Corriger la logique d’affichage dans `ProjectDetail.tsx`
- Remplacer la source d’affichage actuelle basée sur `readySessions` par une base plus cohérente : **toutes les sessions visibles** du projet.
- Garder les sessions “prêtes avec rapport” comme un **sous-ensemble**, pas comme la liste principale.
- Afficher clairement les états attendus :
  - session en attente,
  - session terminée sans rapport,
  - session prête avec rapport,
  - session annulée.
- Éviter qu’une absence de rapport rende la page visuellement vide.

### 3. Séparer données visibles et filtres métier
- Conserver les filtres score / recommandation seulement pour les sessions qui ont un rapport.
- Empêcher qu’un filtre “rapport requis” soit appliqué implicitement à toute la page.
- Adapter le compteur pour qu’il reflète la réalité :
  - total sessions visibles,
  - dont prêtes,
  - dont en traitement si nécessaire.

### 4. Vérifier les autres écrans impactés par la même hypothèse
- Contrôler `Dashboard` et les autres pages qui croisent `sessions` + `reports`.
- Vérifier la page super admin d’organisation pour s’assurer qu’elle ne donne pas l’impression qu’une organisation n’a aucune activité alors que ses projets ont bien des sessions.
- Corriger uniquement les écrans réellement touchés, sans élargir le périmètre.

### 5. Valider avant toute conclusion
- Tester avec `c@bap.fr`.
- Vérifier au moins un projet ALBO avec beaucoup de sessions et un projet Morning avec peu de sessions.
- Confirmer après correction :
  - les sessions sont à nouveau visibles,
  - la sécurisation entre organisations reste intacte,
  - aucune régression sur la vue détail d’une session.

## Ce que je recommande

- **Ne pas revenir en arrière** globalement.
- Corriger d’abord **la logique d’affichage** qui semble masquer les sessions côté organisation.
- Ensuite seulement, si les requêtes elles-mêmes renvoient vide dans le navigateur, on ajustera la RLS de façon ciblée.

## Détails techniques

**Fichier principal suspect :**
- `src/pages/ProjectDetail.tsx`

**Point précis à corriger :**
```text
isReady = session completed + report exists
readySessions = sessions.filter(isReady)
filteredSessions = readySessions.slice()
```

**Direction proposée :**
```text
baseSessions = sessions visibles
filteredSessions = baseSessions + filtres compatibles avec leur état
readySessions = uniquement pour stats / badges / raccourcis
```

**Objectif :**
- ne plus confondre “session visible” et “session prête avec rapport”.
- conserver la sécurité RLS sans réouvrir l’accès inter-organisations.
