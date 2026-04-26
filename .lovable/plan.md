## Objectif

Ajouter dans l'étape **Infos** de la création/édition de projet (à la fin, sous "Message de fin") une option permettant de désactiver les **phrases de transition** que l'IA prononce entre les questions (ex: « Merci. Passons à la suite. », « Écoutez la question suivante »).

Quand l'option est activée (= transitions désactivées), l'IA enchaîne directement à la question suivante, sans message intermédiaire parlé.

---

## 1. Base de données

**Migration** : ajouter une colonne `ai_transitions_enabled` à la table `projects`.

```sql
ALTER TABLE public.projects
ADD COLUMN ai_transitions_enabled boolean NOT NULL DEFAULT true;
```

Valeur par défaut `true` → comportement actuel inchangé pour les projets existants.

---

## 2. Formulaire projet (`src/components/project/ProjectForm.tsx`)

- Ajouter `aiTransitionsEnabled: boolean` dans `ProjectFormState`.
- Ajouter le state local + l'inclure dans le payload de sauvegarde.
- Dans l'étape **Infos** (step 0), juste après le bloc "Message de fin", ajouter un `Switch` :
  - **Label** : « Transitions vocales de l'IA »
  - **Description** : « Si désactivé, l'IA enchaîne directement les questions sans phrase de transition (« Merci, passons à la suite »…). »
  - Switch contrôlant `aiTransitionsEnabled`.

## 3. Pages projet

- `src/pages/ProjectNew.tsx` et `src/pages/ProjectEdit.tsx` :
  - Lire/écrire `ai_transitions_enabled` lors du chargement et de la sauvegarde du projet.
  - Initialiser le state form avec la valeur DB (ou `true` par défaut).

## 4. Côté session candidat (`src/pages/InterviewStart.tsx`)

- Charger `ai_transitions_enabled` depuis le projet.
- Passer ce flag dans le `projectContext` envoyé à l'edge function `ai-conversation-turn` (ex: `transitionsEnabled: boolean`).
- Quand l'IA renvoie `action: "next"` :
  - Si `transitionsEnabled === false` → **ne pas jouer le TTS** du `message` retourné, passer immédiatement à la question suivante (équivalent comportement actuel mais en sautant l'étape audio de transition).
  - Les `follow_up` restent inchangés (ce sont de vraies questions, pas des transitions).
  - Le `end` reste inchangé (message de fin de session).

## 5. Edge function `ai-conversation-turn`

- Lire `projectContext.transitionsEnabled` (default `true`).
- Si `false`, ajuster le prompt système pour demander un `message` vide ou minimal sur les `next` (le client l'ignorera de toute façon, mais ça économise des tokens et évite l'affichage texte).
  - Ajouter une règle : « Si transitionsEnabled = false ET action = "next" → "message" doit être une chaîne vide. »

---

## Récapitulatif des fichiers modifiés

- **Migration SQL** (nouvelle) : ajout colonne `projects.ai_transitions_enabled`
- `src/components/project/ProjectForm.tsx` : state + UI Switch dans step Infos
- `src/pages/ProjectNew.tsx` : load/save de la nouvelle colonne
- `src/pages/ProjectEdit.tsx` : load/save de la nouvelle colonne
- `src/pages/InterviewStart.tsx` : transmettre le flag + skip TTS sur les transitions
- `supabase/functions/ai-conversation-turn/index.ts` : prise en compte du flag dans le prompt

Aucun changement RLS nécessaire (la colonne suit les policies existantes de `projects`).