

# Fix : enchaînement questions audio/vidéo sans lecture TTS du texte

## Problème
Quand une question est de type audio ou vidéo, l'IA lit quand même le texte de la question via TTS **avant** de lancer le média. Résultat : le candidat entend la question deux fois (TTS + média).

## Solution

### 1. Modifier le prompt système de l'IA (`ai-conversation-turn/index.ts`)
- Ajouter le `mediaType` de chaque question dans le contexte envoyé à l'IA
- Instruire l'IA : quand la question suivante est audio/vidéo, dire seulement une transition courte ("Passons à la question suivante") **sans répéter le contenu de la question**

### 2. Modifier `InterviewStart.tsx` — flux `beginInterview`
- Pour la première question audio/vidéo : dire l'intro ("Bonjour... bienvenue...") via TTS, puis lancer directement le média **sans lire le texte de la question**
- Déjà partiellement fait mais le texte de la question est quand même dans le greeting

### 3. Modifier `InterviewStart.tsx` — flux `handleSendResponse`
- Quand la question suivante est audio/vidéo :
  - Parler la réponse de l'IA (transition) via TTS
  - Puis lancer le média directement via `playMediaUrl` (pas `speakOrPlayQuestion` qui re-set isSpeaking)
- Quand la question est texte : comportement actuel (TTS normal)

### 4. Envoyer le `mediaType` des questions au edge function
- Dans le body de `ai-conversation-turn`, ajouter le type de média de chaque question pour que l'IA sache ne pas répéter le texte

### Fichiers impactés

| Fichier | Modification |
|---|---|
| `src/pages/InterviewStart.tsx` | Séparer le flux TTS/média pour ne pas doubler la lecture |
| `supabase/functions/ai-conversation-turn/index.ts` | Ajouter mediaType au prompt, instruire l'IA de ne pas lire les questions audio/vidéo |

