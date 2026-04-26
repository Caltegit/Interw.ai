
## Objectif

Pour chacune des deux options (**Intro IA** et **Transitions entre questions**) déjà en place dans l'étape **Infos**, ajouter :

1. Le **texte par défaut** lu par l'IA, affiché et **modifiable** dans une popup.
2. Une option « **Laisser l'IA s'adapter au contexte des réponses** » (= mode automatique, comportement actuel).

Ainsi, l'utilisateur peut :
- soit garder l'IA libre et contextuelle (mode auto),
- soit imposer un texte fixe qu'elle prononcera systématiquement.

---

## 1. Textes par défaut

**Intro IA** (prononcée juste avant la 1re question)
- Si Q1 média : `Bonjour {prenom}, nous allons démarrer la session. {Regardez|Écoutez} la première question.`
- Si Q1 texte : `Bonjour {prenom}, nous allons démarrer la session, voici la première question : {contenu Q1}`

**Transitions entre questions** (entre 2 questions)
- Texte par défaut court : `Merci. Passons à la question suivante.`

Variables disponibles affichées dans la popup : `{prenom}`, `{poste}`, `{question_suivante}`.

---

## 2. Base de données

Migration : ajouter 4 colonnes à `projects`.

```sql
ALTER TABLE public.projects
  ADD COLUMN ai_intro_mode text NOT NULL DEFAULT 'auto'
    CHECK (ai_intro_mode IN ('auto','custom')),
  ADD COLUMN ai_intro_custom_text text,
  ADD COLUMN ai_question_transitions_mode text NOT NULL DEFAULT 'auto'
    CHECK (ai_question_transitions_mode IN ('auto','custom')),
  ADD COLUMN ai_question_transitions_custom_text text;
```

Les flags `ai_intro_enabled` et `ai_question_transitions_enabled` restent (oui/non global). Les nouveaux champs `*_mode` ne s'appliquent que quand l'option est activée.

---

## 3. UI — étape Infos (`src/components/project/ProjectForm.tsx`)

Pour chaque bloc (Intro IA / Transitions entre questions), garder le **switch** existant et ajouter en dessous, **quand le switch est ON** :

- Un **RadioGroup** :
  - 🔘 « Laisser l'IA s'adapter au contexte des réponses » (auto, par défaut)
  - 🔘 « Utiliser un texte fixe »
- Si « texte fixe » est choisi : un bouton « **Modifier le texte** » qui ouvre une **popup** (`Dialog`) contenant :
  - Un `Textarea` pré-rempli avec le texte par défaut
  - La liste des variables disponibles (`{prenom}`, etc.)
  - Boutons « Annuler » / « Réinitialiser » / « Enregistrer »

Ajouter au state : `aiIntroMode`, `aiIntroCustomText`, `aiQuestionTransitionsMode`, `aiQuestionTransitionsCustomText`.

Nouveau composant : `src/components/project/AiTextCustomizerDialog.tsx` (réutilisé pour les 2 options).

---

## 4. Pages projet (`ProjectNew.tsx`, `ProjectEdit.tsx`)

Lire/écrire les 4 nouvelles colonnes. Valeurs initiales :
- `ai_intro_mode = 'auto'`, `ai_intro_custom_text = null`
- `ai_question_transitions_mode = 'auto'`, `ai_question_transitions_custom_text = null`

---

## 5. Session candidat (`src/pages/InterviewStart.tsx`)

**Greeting (intro IA)** — autour de la ligne 1562 :
- Si `ai_intro_enabled === false` → comportement actuel inchangé (pas de greeting).
- Sinon si `ai_intro_mode === 'custom'` et `ai_intro_custom_text` non vide → utiliser ce texte (avec interpolation de `{prenom}`, `{poste}`, `{question_suivante}` → contenu Q1).
- Sinon → texte par défaut actuel.

**Transitions** — branche `action === "next"` (autour de la ligne 1921) :
- Si `ai_question_transitions_enabled === false` → comportement actuel (silence).
- Sinon si `ai_question_transitions_mode === 'custom'` → **ne pas appeler l'edge function pour générer un message**, utiliser directement le texte personnalisé interpolé et le passer au TTS.
- Sinon → comportement actuel (l'IA génère via `ai-conversation-turn`).

Transmettre les nouveaux flags à l'edge function dans `projectContext` pour que le prompt sache qu'il est en mode auto (déjà le cas) et ne tente pas de générer si on est en mode custom.

---

## 6. Edge function `ai-conversation-turn`

- Lire `projectContext.questionTransitionsMode` (default `'auto'`).
- Si `mode === 'custom'` → ne plus appeler le LLM pour générer le texte de transition. Soit le client gère directement (cas privilégié), soit l'edge renvoie un `message: ""` et le client utilise le texte custom.

Approche choisie : **le client gère le mode custom** → l'edge function n'est pas appelée pour la transition quand `mode === 'custom'`. Pas de changement nécessaire côté edge si le client court-circuite.

---

## Fichiers modifiés

- **Migration SQL** : 4 nouvelles colonnes sur `projects`
- `src/components/project/ProjectForm.tsx` : RadioGroup + bouton « Modifier » sous chaque switch
- `src/components/project/AiTextCustomizerDialog.tsx` (**nouveau**) : popup d'édition réutilisable
- `src/pages/ProjectNew.tsx` : load/save des 4 nouveaux champs
- `src/pages/ProjectEdit.tsx` : load/save des 4 nouveaux champs
- `src/pages/InterviewStart.tsx` : interpolation + court-circuit de l'edge en mode custom
