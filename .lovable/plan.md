

# Refonte layout entretien : 2 colonnes Interviewer / Candidat

## Concept

Layout en deux colonnes distinctes :

```text
┌─────────────────────────┬─────────────────────────┐
│     INTERVIEWER         │      CANDIDAT           │
│                         │                         │
│  ┌───────────────────┐  │  ┌───────────────────┐  │
│  │   Photo avatar    │  │  │   Retour vidéo    │  │
│  │   IA / persona    │  │  │   candidat        │  │
│  └───────────────────┘  │  └───────────────────┘  │
│                         │                         │
│  ┌───────────────────┐  │  ┌───────────────────┐  │
│  │  Question en cours│  │  │  Historique chat   │  │
│  │  (texte/audio/    │  │  │  + transcript     │  │
│  │   vidéo player)   │  │  │  en direct        │  │
│  └───────────────────┘  │  └───────────────────┘  │
│                         │                         │
│  Son activé/coupé       │  [  Envoyer ma réponse ]│
│                         │  🎤  📞                  │
└─────────────────────────┴─────────────────────────┘
```

- **Mobile** : les deux colonnes s'empilent verticalement (interviewer en haut, candidat en dessous)

## Modifications — un seul fichier

### `src/pages/InterviewStart.tsx` (section render, lignes ~625-807)

1. **Colonne gauche (Interviewer)** :
   - Photo avatar IA (existant, déplacé)
   - Zone "Question en cours" avec `QuestionMediaPlayer` (existant, déplacé sous l'avatar)
   - Bouton son activé/coupé + indicateur IA parle

2. **Colonne droite (Candidat)** :
   - Retour vidéo candidat (existant, déplacé)
   - Historique conversation (existant)
   - Transcript live (existant)
   - Boutons d'action : "Envoyer ma réponse", micro, raccrocher

3. **Grid** : `lg:grid-cols-2` au lieu de `lg:grid-cols-5` pour un split 50/50

Aucune logique métier ne change — c'est uniquement un réarrangement des blocs JSX existants.

