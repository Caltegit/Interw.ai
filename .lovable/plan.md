# Plan — Sélecteur Q15 qui retombe sur Q1

## Cause
Dans `src/components/session/SessionReportView.tsx`, l'effet d'auto-lecture de la première question :

```ts
useEffect(() => {
  if (sessionClips.length > 0 && videoNavRef.current) {
    videoNavRef.current.playMessage(sessionClips[0].messageId);
  }
}, [sessionClips]);
```

se déclenche à chaque nouvelle référence de `sessionClips`. Or l'edge function `backfill-report-timestamps` est appelée plusieurs fois après l'ouverture du rapport et provoque des refetch de `session_messages`, donc une nouvelle référence de `sessionClips`. Quand l'utilisateur choisit la Question 15 (ou n'importe quelle question), l'effet refire juste après et ramène le player sur la Question 1.

C'est ce qui explique le symptôme reporté sur Anne Mascarelli et Guillaume Breton : la Q15 apparaît bien dans le sélecteur et dans la Transcription, mais le lecteur revient toujours sur la Q1.

## Correctif
- Ne lancer l'auto-lecture de la première vidéo qu'**une seule fois**, à la première arrivée sur le rapport.
- Garder un `useRef` booléen `hasAutoPlayedRef` mis à `true` au premier lancement réussi pour bloquer toute relance ultérieure.
- Dépendance de l'effet : conserver `sessionClips` pour pouvoir attendre que les clips soient prêts, mais sortir immédiatement si l'auto-lecture a déjà eu lieu.

## Fichier modifié
- `src/components/session/SessionReportView.tsx`

## Validation
- Ouvrir le rapport d'Anne Mascarelli dans la preview
- Sélectionner la Question 15 dans le player → la vidéo doit se charger et rester sur Q15
- Vérifier qu'au premier chargement, la Question 1 démarre toujours automatiquement
- Refaire le test sur le rapport de Guillaume Breton