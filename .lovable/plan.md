## Diagnostic

Oui, la stratégie multi-couches mise en place (pagehide / visibilitychange / sendBeacon + `finalize-abandoned-session`) fonctionne **aussi sur desktop** : ce sont des events DOM standards. Si un utilisateur ferme l'onglet brutalement, la récupération marche pareil.

Mais en relisant `handleSubmitResponse` dans `src/pages/InterviewStart.tsx`, j'ai trouvé une **race condition propre à la dernière question** qui explique pourquoi la dernière réponse "saute" parfois (même sur desktop, sans rien fermer) :

### Le bug

Quand le candidat envoie sa réponse :

1. L'upload vidéo + l'insert du message candidat partent en arrière-plan dans `persistCandidatePromise` (ligne 1788-1845).
2. L'IA répond `action: "end"` sur la dernière question.
3. La branche **NEXT** (ligne 2076) **et** la branche **FOLLOW-UP** (ligne 1937) attendent toutes les deux `await persistCandidatePromise` avant d'avancer (commentaire `CLOSE_PREV`).
4. Mais la branche **END** (lignes 1971-1998) **n'attend pas** `persistCandidatePromise` avant d'appeler `endInterviewRef.current?.()`.

Conséquence : `endInterview()` navigue immédiatement vers `/complete` (ligne 2369), puis lance `generate-report` en arrière-plan. Si l'upload du dernier segment ou l'insert du dernier message n'est pas encore terminé :

- Le rapport est généré **sans la dernière réponse** dans `session_messages`.
- La vidéo de la dernière question peut être absente du bucket au moment de la transcription.

C'est exactement le pattern décrit : "la dernière question saute". Sur fibre desktop ça arrive moins, mais dès que le réseau ralentit (4G correcte, wifi café), `persistCandidatePromise` met >1 s et perd la course contre `generate-report`.

### Correctif

Ajouter le même `await persistCandidatePromise` qu'on a dans les autres branches, juste avant `endInterviewRef.current?.()` :

```ts
// ── 5. END branch ──
if (action === "end" || isLastQuestion) {
  // ... (ajout de la closing message comme aujourd'hui)

  // CLOSE_PREV : attendre l'upload du dernier segment + insert candidat
  // AVANT de finaliser la session (sinon generate-report tourne sans la
  // dernière réponse).
  if (persistCandidatePromise) {
    try { await persistCandidatePromise; } catch {}
    if (token.aborted) { aborted = true; return; }
  }

  setQuestionLoading({ label: "Finalisation de la session…", percent: 95 });
  await speak(closing);
  if (token.aborted) { aborted = true; return; }
  endInterviewRef.current?.();
  return;
}
```

Ordre choisi : on attend l'upload **pendant** que la TTS de clôture joue (perçu = 0 latence ajoutée pour le candidat, puisque `speak(closing)` prend déjà 2-4 s). En pratique on peut même `Promise.all` les deux pour aller plus vite :

```ts
await Promise.all([
  persistCandidatePromise ?? Promise.resolve(),
  speak(closing),
]);
```

### Belt-and-suspenders supplémentaire

`endInterview()` (ligne 2343) re-tente déjà `stopAndUploadQuestionVideo` si le recorder est encore actif. Mais comme `persistCandidatePromise` a déjà appelé `stopAndUploadQuestionVideo`, le recorder est `inactive` et ce filet ne se déclenche pas. On laisse comme ça (le vrai fix est l'await ci-dessus).

En revanche, on peut aussi **awaiter `backgroundJobsRef`** un peu plus longtemps avant `generate-report` (actuellement timeout 5 s ligne 2394). Si l'utilisateur a du réseau dégradé, 5 s ne suffit pas toujours pour finir l'upload d'une vidéo de 30-60 s. → passer à 15 s pour la finalisation, ce qui ne ralentit rien (l'utilisateur est déjà sur l'écran `/complete` qui poll le status).

## Fichiers touchés

- `src/pages/InterviewStart.tsx` — ajouter `await persistCandidatePromise` dans la branche END (ligne ~1994), passer le timeout `flush` de 5 s à 15 s (ligne ~2394).

## Effets de bord

- Aucune régression sur le flux normal : on attend juste un upload qui était déjà en cours.
- Latence perçue côté candidat : nulle (l'attente se fait pendant la TTS de clôture).
- Le filet `finalize-abandoned-session` reste là pour les vrais abandons (fermeture d'onglet pendant l'enregistrement).
