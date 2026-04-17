

## Renommer le bouton + améliorer l'UX de prise de parole

### Changement immédiat demandé

Dans `src/pages/InterviewStart.tsx`, renommer le bouton **« Répondre à la question »** → **« Ma réponse est finie »**.

### Problème UX sous-jacent

Aujourd'hui le candidat ne sait pas clairement :
1. **Quand** il doit commencer à parler (la question vient d'être lue, est-ce à lui ?)
2. **Que** sa voix est captée en temps réel (le micro écoute déjà)
3. **Quand** cliquer sur le bouton (à la fin de sa réponse, pas avant)

### Proposition UX (la meilleure pratique pour entretien vidéo IA)

**1. Indicateur d'état "À vous de parler" très visible**

Sous la question, afficher une zone d'état dynamique qui change selon la phase :

- 🔵 **Lecture question** → « L'IA pose la question… » (pendant TTS/audio/vidéo)
- 🟢 **Écoute active** → « 🎙️ À vous — parlez maintenant » + pulse animé sur l'icône micro + visualisation niveau audio (barre/onde qui réagit à la voix)
- 🟡 **Traitement** → « Analyse de votre réponse… »

**2. Bouton principal contextualisé**

- État "écoute" : gros bouton vert proéminent **« ✓ Ma réponse est finie »** (au lieu de "Répondre à la question")
- État "lecture" : bouton désactivé grisé **« Écoutez la question… »**
- État "traitement" : spinner **« Traitement en cours… »**

**3. Aide visuelle persistante (1 ligne sous le bouton)**

> *Parlez naturellement. Cliquez sur « Ma réponse est finie » dès que vous avez terminé.*

Affichée uniquement les **2 premières questions** (puis on suppose le candidat a compris) — évite la sur-information.

**4. Live transcript déjà existant** = preuve visuelle que le micro fonctionne. On le garde tel quel mais on ajoute un petit label **« Transcription en direct »** au-dessus pour que le candidat comprenne ce qu'il voit.

### Hors scope

- Pas de changement du flux d'auto-skip (silence détecté → passage auto), il reste comme garde-fou.
- Pas de tutoriel modal au début (déjà couvert par l'écran de vérif technique).

### Fichier modifié

- `src/pages/InterviewStart.tsx` uniquement.

