# Bug Q15 — diagnostic et plan de correction

## Diagnostic

Pour la session de Léa Fulco (`d7014025…`), la Q15 ne joue pas parce que **le fichier `q14.webm` n'a jamais été reconstruit**. La cause n'est pas un problème de lecteur ni d'extension : les chunks bruts sont éparpillés sur **deux dossiers**.

État réel du stockage pour Q15 :

- `q14/chunk-00001.webm`, `00003`, `00005`, …, `00085` (uniquement les **impairs**) + `chunk-00086` final
- Les chunks **pairs** (`00038`, `00040`, …, `00086`) sont écrits dans `q13/` (le dossier de la question précédente)
- `q14.audio.webm` existe (2 Mo) → l'audio est OK, seul le conteneur vidéo manque
- Le manifest `q14/manifest.json` liste explicitement ces deux chemins :
  ```text
  q14/chunk-00037.webm
  q13/chunk-00038.webm   ← fuite
  q14/chunk-00039.webm
  q13/chunk-00040.webm   ← fuite
  …
  ```

Conséquence : `recover-session-video` ne liste que `q14/`, ne trouve pas le `chunk-00000` qui contient le header EBML, échoue → pas de `q14.webm` final → lecteur en erreur.

Le pattern (pairs vers q13, impairs vers q14) prouve que **deux MediaRecorder coexistent à la transition Q14→Q15** : le recorder de la question précédente n'est pas complètement arrêté quand le suivant démarre, ses callbacks `ondataavailable` continuent d'arriver, et ils partagent un compteur global de chunks → un chunk sur deux part dans le mauvais dossier.

## Plan

### 1. Récupérer immédiatement la Q15 de Léa (one-shot)

Étendre `supabase/functions/recover-session-video/index.ts` avec un mode **"suivre le manifest"** :
- si `q{N}/manifest.json` existe et liste des chunks dans des dossiers étrangers, télécharger exactement la liste (et non plus `list("q{N}/")`),
- ordonner par numéro `chunk-XXXXX` indépendamment du dossier source,
- assembler en streaming → upload atomique de `q14.webm` (logique atomique déjà en place).

Lancer la reconstruction pour `session_id=d7014025-…`, `question_index=14`. Vérifier en aval que le fichier est servi en 200 et que le lecteur du rapport affiche bien la vidéo.

### 2. Corriger la cause racine côté front

Dans `src/pages/InterviewStart.tsx` (flux d'enregistrement) :
- arrêter **synchroniquement** le MediaRecorder de la question N et attendre `onstop` avant d'instancier celui de N+1,
- capturer `questionIndex` **par instance de recorder** (closure locale, pas variable React lue à chaud), pour que chaque chunk parte dans le bon dossier même si un dernier `ondataavailable` arrive en retard,
- réinitialiser le compteur de chunks **par question** au lieu d'un compteur global partagé entre deux recorders concurrents,
- côté `uploadChunk`, refuser un chunk dont le `questionIndex` capturé ne correspond plus au recorder courant n'est PAS la bonne barrière (trop tard) — la barrière doit être à la création du chunk : un recorder = un dossier figé.

### 3. Filet de sécurité backend

Dans `finalize-abandoned-session/index.ts`, lors du scan d'un dossier `q{N}/`, **toujours lire le manifest en priorité s'il existe**, et accepter les chemins inter-dossiers qu'il référence. Cela protège les sessions déjà enregistrées avec l'ancien bug.

### 4. Validation

- Reconstruction Q15 Léa : HEAD 200, durée ≈ celle de l'audio (≈ 1 min 23 s vu la taille), lecture VP8/9 OK dans le navigateur.
- Test d'entretien neuf de bout en bout : vérifier que chaque dossier `q{N}/` contient une séquence **continue** de chunks (`00000`, `00001`, …) sans trou et sans débordement dans `q{N-1}/`.

## Fichiers touchés

- `supabase/functions/recover-session-video/index.ts` — mode "follow manifest"
- `supabase/functions/finalize-abandoned-session/index.ts` — idem, en filet
- `src/pages/InterviewStart.tsx` — arrêt synchrone du recorder + compteur par question + closure du dossier cible
- `.lovable/plan.md` — mise à jour
