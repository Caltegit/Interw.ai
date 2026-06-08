# Fix: téléphone candidat absent du rapport

## Diagnostic

C'est bien un bug. La chaîne d'affichage est correcte :

- `DecisionBanner.tsx` affiche déjà `candidatePhone` (lignes 314 et 343) sous l'email.
- `SessionReportView.tsx` (ligne 343) lui passe `session.candidate_phone`.
- Le formulaire candidat (`InterviewLanding.tsx`) enregistre bien `candidate_phone` en base.

**Mais** dans `src/hooks/queries/useSessionDetail.ts` (ligne 18), la colonne `candidate_phone` n'est pas listée dans le `SELECT` envoyé à `sessions`. Du coup `session.candidate_phone` vaut toujours `undefined` côté client, et le `{candidatePhone && ...}` ne rend rien — même quand le numéro est bien stocké en base.

## Changement

Ajouter `candidate_phone` à la liste des colonnes sélectionnées dans `useSessionDetail.ts` (un seul fichier, une seule ligne).

Avant :
```
"id, candidate_name, candidate_email, candidate_linkedin_url, ..."
```

Après :
```
"id, candidate_name, candidate_email, candidate_phone, candidate_linkedin_url, ..."
```

## Vérification

Recharger `/sessions/fa739e5d-...` et confirmer que le téléphone apparaît sous l'email dans le bandeau de décision (vues mobile et desktop, déjà gérées par `DecisionBanner`).
