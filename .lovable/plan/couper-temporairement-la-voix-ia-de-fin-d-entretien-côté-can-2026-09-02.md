# Couper temporairement la voix IA de fin d'entretien (côté candidat)

## Cause

Le son de clôture est déclenché à un seul endroit : `src/pages/InterviewStart.tsx`, ligne ~3118, dans une `Promise.all` :

```ts
await Promise.all([
  persistCandidatePromise ?? Promise.resolve(),
  speak(closing),
]);
```

La phrase est aussi préchargée au démarrage via `prefetchTransitionPhrases(...)` avec `STATIC_TRANSITION_PHRASES.closing`.

## Plan

### Étape 1 — Ajouter un interrupteur temporaire

Dans `src/pages/InterviewStart.tsx`, ajouter une constante en tête de fichier :

```ts
const DISABLE_CLOSING_VOICE = true;
```

### Étape 2 — Sauter la TTS de clôture

Lors de la branche `end`, remplacer :

```ts
await Promise.all([
  persistCandidatePromise ?? Promise.resolve(),
  speak(closing),
]);
```

par :

```ts
if (DISABLE_CLOSING_VOICE) {
  await (persistCandidatePromise ?? Promise.resolve());
} else {
  await Promise.all([
    persistCandidatePromise ?? Promise.resolve(),
    speak(closing),
  ]);
}
```

On garde le texte affiché, son enregistrement en base, et l'overlay "Finalisation de la session…". Seul le son disparaît.

### Étape 3 — Éviter un appel ElevenLabs inutile

Dans le prefetch, exclure la phrase de clôture de la liste préchargée quand `DISABLE_CLOSING_VOICE` est vrai. Cela évite de générer un audio qui ne sera jamais joué.

Fichier concerné : `src/lib/ttsCache.ts`.

### Étape 4 — Vérifier qu'on ne casse pas la fin de session

- `endInterviewRef.current?.()` doit toujours être appelé après résolution de la promesse.
- Le message textuel `"Merci pour cette session, à bientôt."` doit rester visible/dans le transcript (seul l'audio est coupé).
- Tester un entretien démo complet : arriver à `/complete` sans erreur.

### Étape 5 — Revenir en arrière facilement

La constante `DISABLE_CLOSING_VOICE` est volontairement explicite. Pour réactiver la voix de fin, la remettre à `false` suffit.

## Détails techniques

- Fichiers : `src/pages/InterviewStart.tsx`, `src/lib/ttsCache.ts`.
- Aucune migration base de données.
- Aucun impact sur les questions, les réponses candidat, les rapports ou les emails.
- Réduit légèrement la consommation ElevenLabs.
