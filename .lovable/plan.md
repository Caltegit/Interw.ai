

## Aperçu vidéo en direct avant l'enregistrement

### Le problème

Aujourd'hui, quand on clique sur « Enregistrer vidéo » (intro projet ou question), la caméra s'allume et l'enregistrement démarre **immédiatement**. Le candidat-recruteur n'a aucun moment pour se cadrer, vérifier la lumière ou ajuster sa posture avant que ça tourne.

### La solution proposée : un mode « miroir » avec compte à rebours

Le clic sur « Enregistrer vidéo » ne lance plus directement la capture. À la place, un nouveau panneau s'ouvre avec **trois étapes claires** :

**1. Aperçu (mode miroir)**
- La caméra s'allume immédiatement, le flux vidéo s'affiche en **miroir** (effet selfie naturel) dans un cadre arrondi.
- Une jauge de niveau micro en bas du cadre confirme que le son est capté.
- Deux boutons : **« Démarrer l'enregistrement »** (primary) et **« Annuler »** (qui coupe la caméra).
- Texte d'aide : « Cadrez-vous, vérifiez la lumière puis lancez l'enregistrement. »

**2. Compte à rebours (3 → 2 → 1)**
- Au clic sur « Démarrer », un overlay semi-transparent affiche un compte à rebours **3, 2, 1** par-dessus le flux miroir.
- L'enregistrement démarre uniquement à la fin du décompte.

**3. Enregistrement**
- L'aperçu reste affiché (toujours en miroir pour le confort visuel), avec :
  - Pastille rouge clignotante + libellé « Enregistrement »
  - **Chronomètre** (mm:ss) qui s'incrémente
  - Bouton « Arrêter »

Une fois arrêté, l'aperçu de relecture s'affiche **sans miroir** (comme la vidéo finale sera vue par le candidat).

### Améliorations annexes

- **Audio** : ajout d'une jauge de niveau micro animée pendant l'enregistrement audio (intro et questions), pour confirmer visuellement que la voix est captée.
- **Format vidéo** : cadre passé de `max-w-xs` à `max-w-md` avec ratio 16:9 fixé (`aspect-video`) pour un rendu plus pro et cohérent.
- **Bouton « Refaire »** : sur la relecture finale, un bouton « Refaire la prise » à côté de « Supprimer » pour relancer directement l'aperçu sans avoir à supprimer puis recliquer.

### Détails techniques

**Fichiers modifiés :**
- `src/components/project/IntroVideoRecorder.tsx`
- `src/components/project/QuestionMediaRecorder.tsx`
- `src/components/project/IntroAudioRecorder.tsx` (jauge micro uniquement)

**Nouveau composant partagé :**
- `src/components/project/VideoRecorderPanel.tsx` — gère les 3 états (`preview` | `countdown` | `recording`), le flux `getUserMedia`, le compte à rebours, le chrono, la jauge micro via `AudioContext` + `AnalyserNode`. Réutilisé par l'intro et les questions.
- `src/components/project/MicLevelMeter.tsx` — petite barre horizontale animée (5-10 segments) alimentée par un `AnalyserNode`. Réutilisée pour l'audio seul aussi.

**Logique clé :**
- `getUserMedia` est appelé dès l'ouverture du panneau (état `preview`), pas au clic sur « Démarrer ».
- Le flux est attaché à `<video muted autoPlay playsInline style={{ transform: 'scaleX(-1)' }}>` pour l'effet miroir pendant la capture (le fichier enregistré reste non-miroir, c'est uniquement un effet CSS).
- Le `MediaRecorder` n'est instancié et démarré qu'à la fin du compte à rebours.
- Au démontage ou annulation : `stream.getTracks().forEach(t => t.stop())` + fermeture de l'`AudioContext`.

### Hors champ

- Pas de sélection de la caméra/micro source (toujours le périphérique par défaut). À ajouter plus tard si besoin.
- Pas de filtres ni d'arrière-plan flouté.
- Pas de re-trim de la vidéo enregistrée.

