## Objectif

Remplacer l'unique switch « Transitions vocales de l'IA » par **deux options distinctes** dans l'étape **Infos** du formulaire projet, pour un contrôle plus fin :

1. **Intro IA** (oui/non) — la phrase d'amorce prononcée par l'IA en début de session (ex: « Bonjour Marc, nous allons démarrer l'entretien… »).
2. **Transitions entre questions** (oui/non) — les phrases de liaison entre deux questions (ex: « Merci, passons à la suite »).

Les deux options sont indépendantes. Par défaut : les deux activées (comportement actuel).

> Note : ce switch ne touche **pas** à l'intro configurée manuellement (champ « Activer l'intro » texte/audio/vidéo de l'étape Infos). Ce sont deux choses différentes : l'intro manuelle reste pilotée par `intro_enabled`, et l'intro IA générée à la volée est pilotée par le nouveau flag.

---

## 1. Base de données

Migration : remplacer la colonne unique `ai_transitions_enabled` par deux colonnes.

```sql
ALTER TABLE public.projects
  ADD COLUMN ai_intro_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN ai_question_transitions_enabled boolean NOT NULL DEFAULT true;

-- Reprendre l'ancienne valeur dans les deux nouvelles colonnes
UPDATE public.projects
SET ai_intro_enabled = ai_transitions_enabled,
    ai_question_transitions_enabled = ai_transitions_enabled;

ALTER TABLE public.projects DROP COLUMN ai_transitions_enabled;
```

---

## 2. Formulaire (`src/components/project/ProjectForm.tsx`)

- Remplacer dans `ProjectFormState` :
  - `aiTransitionsEnabled: boolean` → `aiIntroEnabled: boolean` + `aiQuestionTransitionsEnabled: boolean`.
- Dans l'étape **Infos** (sous « Message de fin »), afficher **deux switches** côte à côte :
  - **Intro IA** — « Si désactivé, l'IA ne prononce pas de phrase d'accueil avant la première question. »
  - **Transitions entre questions** — « Si désactivé, l'IA enchaîne directement les questions sans phrase de liaison. »

## 3. Pages projet

- `src/pages/ProjectNew.tsx` et `src/pages/ProjectEdit.tsx` :
  - Remplacer la lecture/écriture de `ai_transitions_enabled` par `ai_intro_enabled` + `ai_question_transitions_enabled`.
  - Mettre à jour `initialState` (les deux à `true`).

## 4. Session candidat (`src/pages/InterviewStart.tsx`)

- Charger les deux flags depuis le projet.
- Les transmettre à l'edge function dans `projectContext` : `introEnabled`, `questionTransitionsEnabled`.
- Logique TTS :
  - **Action `start` / première interaction** : si `introEnabled === false`, ne pas jouer le TTS de la phrase d'accueil et passer directement à la Q1.
  - **Action `next`** : si `questionTransitionsEnabled === false`, ne pas jouer le TTS de la transition (comportement déjà en place, à brancher sur le nouveau flag).
  - Les questions texte continuent d'être lues (comportement déjà validé).

## 5. Edge function `ai-conversation-turn`

- Lire `projectContext.introEnabled` et `projectContext.questionTransitionsEnabled` (default `true` pour les deux).
- Adapter le prompt système :
  - Si `introEnabled === false` → la phrase d'accueil doit être vide.
  - Si `questionTransitionsEnabled === false` ET `action === "next"` → `message` doit être vide.

---

## Fichiers modifiés

- **Migration SQL** : remplacer `ai_transitions_enabled` par `ai_intro_enabled` + `ai_question_transitions_enabled`
- `src/components/project/ProjectForm.tsx` : 2 switches au lieu d'un
- `src/pages/ProjectNew.tsx` : load/save des 2 colonnes
- `src/pages/ProjectEdit.tsx` : load/save des 2 colonnes
- `src/pages/InterviewStart.tsx` : transmettre les 2 flags + logique TTS séparée
- `supabase/functions/ai-conversation-turn/index.ts` : prise en compte des 2 flags
