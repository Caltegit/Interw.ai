## Cause du décalage

Dans `src/pages/ProjectDetail.tsx`, la liste affichée n'inclut que les sessions « prêtes » (`readySessions` : terminées avec rapport disponible), mais les pastilles de filtre (« À traiter », « Retenu », « À discuter », « Non ») comptent sur **toutes** les sessions du projet (`sessions`), y compris celles encore en attente, en cours ou en cours de traitement (sans rapport).

Résultat : « À traiter 4 » alors qu'une seule ligne « À traiter » apparaît dans le tableau (les 3 autres sessions sont encore en `pending` / `in_progress` / sans rapport et n'ont jamais reçu de décision, donc tombent par défaut dans `none`).

## Correction

Calculer le compteur des pastilles à partir du même ensemble que celui qui alimente la liste, c'est-à-dire `readySessions`.

### Détails techniques

- Fichier : `src/pages/ProjectDetail.tsx`
- Ligne ~594 : remplacer
  ```ts
  const count = sessions.filter((s) => (s.recruiter_decision ?? "none") === d.value).length;
  ```
  par
  ```ts
  const count = readySessions.filter((s) => (s.recruiter_decision ?? "none") === d.value).length;
  ```
- Aucun autre changement nécessaire : les filtres et l'affichage utilisent déjà `readySessions`.

## Hors périmètre

- Pas de migration DB.
- Pas de changement sur la logique de décision recruteur ni sur le statut des sessions.
