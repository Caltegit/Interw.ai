

## Plan — Quick Win : améliorer les relances et interactions de l'IA

### Objectif

Rendre l'IA plus humaine et engageante en enrichissant son comportement conversationnel, **sans changer la voix** (gros chantier ElevenLabs reporté).

### 1. Nouveau champ projet : `relance_level`

Migration SQL pour ajouter à `projects` :
- Colonne `relance_level` de type text avec valeurs `'light' | 'medium' | 'deep'`, défaut `'medium'`.
- Pas de contrainte CHECK (on validera côté code et via le wizard).

### 2. UI wizard — exposer le paramètre

Dans `StepQuestions.tsx` (ou en haut de l'étape questions), ajouter un petit sélecteur :
- **Léger** : 0 relance, l'IA enchaîne.
- **Moyen** (défaut) : 1 relance si réponse vague/courte.
- **Approfondi** : jusqu'à 2 relances + reformulations.

Mêmes modifs dans `ProjectNew.tsx` et `ProjectEdit.tsx` pour persister la valeur.

### 3. Edge function `ai-conversation-turn` — prompt enrichi

Refonte du `systemPrompt` pour intégrer :

a) **Relances calibrées** selon `relance_level` (passé dans `projectContext`) :
- light → pas de relance, juste transition.
- medium → 1 relance si réponse < 2 phrases ou floue ("Pouvez-vous donner un exemple concret ?").
- deep → jusqu'à 2 relances, creuse les mots-clés mentionnés par le candidat.

b) **Reformulation active** (medium/deep) : avant la question suivante, courte reformulation de ce que le candidat vient de dire ("Si je comprends bien, vous avez…").

c) **Réactions émotionnelles naturelles** : variations d'acquiescements ("Intéressant", "Ok je vois", "Merci pour cet exemple") au lieu du seul "Merci".

d) **Mémoire intra-entretien légère** : autoriser l'IA à référencer un point évoqué plus tôt si pertinent ("Tout à l'heure vous parliez de X…").

e) **Gestion du silence/hésitation** : si la réponse fait < 5 mots, proposer "Prenez votre temps, voulez-vous que je reformule ?".

f) **Garde-fous conservés** : ne pas répéter le contenu d'une question audio/vidéo, rester en français, ne pas inventer de questions.

### 4. Côté client — passer `relance_level`

Dans `InterviewStart.tsx` (ou le hook qui appelle `ai-conversation-turn`), récupérer `project.relance_level` et l'inclure dans le `projectContext` envoyé à l'edge function.

### Fichiers touchés

- Migration SQL (ajout colonne).
- `src/pages/ProjectNew.tsx` + `src/pages/ProjectEdit.tsx` (état + persistance).
- `src/components/project/StepQuestions.tsx` (sélecteur UI).
- `src/integrations/supabase/types.ts` — auto-régénéré.
- `src/pages/InterviewStart.tsx` (transmission du paramètre).
- `supabase/functions/ai-conversation-turn/index.ts` (prompt enrichi).

### Hors scope (gros chantier — pour plus tard)

- Voix ElevenLabs (TTS naturel ou agent temps réel).
- Adaptation séniorité auto-détectée.
- Vitesse de parole ajustable côté candidat.

