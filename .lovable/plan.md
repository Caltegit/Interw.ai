

## Plan — Timer de réponse par question (sans suggestions)

### Concept

Ajouter un compteur de temps visuel discret qui s'affiche pendant que le candidat répond à une question. Simple, informatif, sans conseils ni indications.

### Comportement

- **Démarre** : quand `isListening` passe à `true` (IA a fini de poser la question, candidat peut parler)
- **S'arrête** : quand `isListening` passe à `false` (réponse envoyée, passage question suivante)
- **Se met en pause** : quand `isPaused` est `true` (bouton pause)
- **Se réinitialise** : à chaque changement de `currentQuestionIndex`
- **Format** : `MM:SS` (minutes:secondes)
- **Couleur unique** : texte neutre, pas de changement de couleur selon le temps

### Implémentation

**Fichier** : `src/pages/InterviewStart.tsx`

**Ajouts** :
1. State `responseElapsedSec: number` (initial: 0)
2. `useEffect` avec `setInterval` qui incrémente toutes les secondes quand `isListening && !isPaused`
3. `useEffect` de reset quand `currentQuestionIndex` change
4. Affichage dans le bandeau d'état "À vous !" / zone du bouton

**Emplacement UI** : À côté du texte "🎙️ À vous !" ou à droite du bouton "Ma réponse est terminée". Position discrète, non intrusive.

### Hors scope

- Pas de seuils colorés (pas d'ambre/rouge)
- Pas de texte indicatif ("tu peux conclure", "synthétise")
- Pas de limite dure (le silence 45s reste le seul garde-fou)
- Pas de stockage en base

