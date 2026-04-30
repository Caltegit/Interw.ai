## Problème

Sur la session « Énigme - Niveau 1 » (et tout projet utilisant le TTS navigateur), certaines questions s'arrêtent en cours de lecture.

## Cause

Dans `src/pages/InterviewStart.tsx` (ligne 737), le « safety timer » du fallback navigateur est plafonné à **20 secondes** :

```ts
const safetyMs = Math.min(20000, Math.ceil(text.length / 15) * 1000 + 4000);
```

Le `Math.min` agit comme un plafond : peu importe la longueur du texte, la lecture est coupée au bout de 20 s. Or les énigmes font 250 à 410 caractères (≈ 25-35 s à lire) → la voix est coupée.

Le projet « Énigme » utilise `tts_provider = browser`, donc c'est ce code qui s'exécute.

## Correctifs

### 1. `src/pages/InterviewStart.tsx` — fix du safety timer

Remplacer la formule par une borne basée sur la longueur réelle, plafonnée à 90 s :

```ts
// ~12 caractères/seconde en français + 5 s de marge, plafonné à 90 s
const safetyMs = Math.min(90000, Math.ceil(text.length / 12) * 1000 + 5000);
```

### 2. Limite de 450 caractères sur les questions

Imposer cette limite côté formulaire à 3 endroits :

- **`src/components/QuestionFormDialog.tsx`** (questions de projet) — `maxLength={450}` sur le `<Textarea>` du contenu + compteur « X / 450 » + message d'erreur si dépassé à la soumission.
- **`src/components/project/StepQuestions.tsx`** (édition inline éventuelle) — même `maxLength` sur le textarea de contenu si présent.
- **Bibliothèque de questions** : appliquer la même limite dans le dialogue d'édition de `question_templates` (si l'édition se fait via `QuestionFormDialog`, c'est déjà couvert ; sinon ajouter `maxLength` au textarea correspondant).

Pas de migration ni de contrainte SQL : on garde la validation côté UI uniquement (les questions existantes plus longues restent fonctionnelles, mais avec le fix du safety timer elles seront désormais lues entièrement).

### 3. Vérifier les énigmes existantes

Les 10 énigmes vont de 141 à 411 caractères → toutes sous 450. Pas besoin de les retoucher.

## Hors scope

- Pas de changement côté ElevenLabs (déjà OK)
- Pas de contrainte SQL `CHECK length(content) <= 450` (resterait bloquant pour la lib existante)
