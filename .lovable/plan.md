

# Refonte layout entretien : 2 colonnes simplifiées

## Layout cible

```text
┌──────────────────────────────────────────────┐
│            [Arrêter l'entretien]             │
├──────────────────────┬───────────────────────┤
│   COLONNE 1 (gauche) │   COLONNE 2 (droite)  │
│                      │                       │
│   Photo/Vidéo IA     │   Retour vidéo        │
│   (avatar ou player) │   candidat            │
│                      │                       │
│   Question texte     │   [Répondre à la      │
│   en dessous         │    question]           │
│                      │                       │
└──────────────────────┴───────────────────────┘
```

## Modifications (`src/pages/InterviewStart.tsx`)

### 1. Colonne gauche : Interviewer + Question
- Avatar IA (ou vidéo player si question vidéo) — comme actuellement
- En dessous : le texte de la question (ou le player audio/written featured)
- Supprimer le toggle son et l'indicateur processing de cette colonne

### 2. Colonne droite : Retour vidéo + Bouton
- Retour vidéo candidat (avec badge REC)
- Bouton "Répondre à la question" en dessous (remplace "Envoyer ma réponse")
- Bouton micro en dessous du bouton principal
- Auto-skip countdown reste visible ici

### 3. Supprimer de l'interface
- **Historique de conversation** (la Card avec les messages scrollables) — supprimé
- **Live transcript** (le bloc "Vous (en cours...)") — supprimé
- Toggle son déplacé en petit sous la vidéo candidat

### 4. Grid 50/50
- Passer de `lg:grid-cols-5` à `lg:grid-cols-2` pour un layout équilibré

## Résumé
1 fichier modifié. Simplification majeure : suppression de l'historique de conversation et du transcript live, layout 2 colonnes égales avec interviewer à gauche et candidat à droite.

