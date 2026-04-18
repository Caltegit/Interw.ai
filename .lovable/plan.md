

## Analyse UX — création/édition de question dans la bibliothèque

Avant de proposer, je relis le composant concerné.

### Constat actuel (`QuestionLibraryManager.tsx` + `QuestionMediaRecorder.tsx`)

Le formulaire d'ajout/édition empile verticalement, sans hiérarchie claire :
- Champ **Titre** (input)
- Champ **Question** (textarea)
- Champ **Catégorie** (input libre, pas de suggestions des catégories existantes)
- **Type de média** (3 boutons radio : Texte / Audio / Vidéo)
- **Enregistreur média** (un seul bouton "Enregistrer audio/vidéo")
- **Switch relance IA** + slider max relances
- Boutons Annuler / Enregistrer

### Problèmes identifiés

1. **Médias enregistrés invisibles dans la liste** — la liste des questions n'affiche aucune indication qu'une question a un audio/vidéo attaché, et on ne peut pas le lire sans entrer en édition. C'est ton point principal.
2. **Pas de prévisualisation au survol/clic dans la liste** — il faut éditer pour écouter.
3. **Re-enregistrer = supprimer puis recommencer** — pas de bouton "Refaire" direct.
4. **Pas d'upload de fichier** — uniquement enregistrement live, alors qu'un RH peut avoir un MP3/MP4 prêt.
5. **Catégorie en input libre** → fautes de frappe, doublons ("Soft skills" vs "soft skill").
6. **Pas de durée affichée** sur les médias enregistrés.
7. **Pas de compteur de caractères** sur le contenu de la question.
8. **Toggle Texte/Audio/Vidéo confus** — si on a déjà enregistré un audio puis on clique "Vidéo", l'audio est perdu silencieusement.
9. **Formulaire trop long** dans le dialog → sur viewport 966×680 le bouton Sauvegarder peut passer sous le pli (même problème qu'on a déjà eu sur les intros vidéo).
10. **Pas de feedback visuel** sur la qualité du son pendant l'enregistrement (pas de VU-mètre, alors qu'on a déjà `MicVolumeMeter`).

### Propositions d'amélioration (ordonnées par impact)

**P1 — Lecture des médias depuis la liste** (résout le pain principal)
- Dans chaque carte de question de la liste : si `audio_url` ou `video_url` présent, afficher un mini-player inline (bouton play + durée + waveform simplifié pour audio, thumbnail vidéo cliquable qui ouvre un popover avec lecteur).
- Badge visuel "🎤 Audio" / "🎬 Vidéo" déjà bien visible (pas seulement en édition).

**P2 — Refonte du dialog en deux colonnes ou onglets**
- Layout en sections claires avec scroll interne et footer sticky (comme le fix qu'on a fait sur les intros vidéo) :
  - Section "Question" (titre + contenu + catégorie + compteur)
  - Section "Média" (type + enregistreur + upload fichier + lecteur preview)
  - Section "Relance IA" (switch + slider, replié par défaut)
- Footer toujours visible avec bouton Sauvegarder.

**P3 — Enregistreur média amélioré**
- Bouton "Refaire" qui combine supprimer + ré-enregistrer en un clic.
- Bouton "Importer un fichier" (audio: mp3/m4a/wav, vidéo: mp4/webm/mov).
- Affichage de la **durée** du média une fois enregistré.
- VU-mètre micro pendant l'enregistrement audio (réutilise `MicVolumeMeter`).
- Timer d'enregistrement (00:23 / max 2:00) + limite max configurable.
- Avertissement explicite si on change de type média alors qu'un enregistrement existe.

**P4 — Catégorie : combobox intelligent**
- Remplacer l'input libre par un combobox listant les catégories déjà utilisées dans l'org + permettre de créer une nouvelle valeur. Évite les doublons.

**P5 — Améliorations liste**
- Recherche par titre + filtre par catégorie + filtre par type de média (déjà partiellement présent dans `QuestionLibraryDialog` côté projets, à harmoniser).
- Tri (alphabétique / récemment ajouté / catégorie).
- Action "Dupliquer" une question.

**P6 — Petits détails UX**
- Compteur caractères sur le contenu (max suggéré ~500).
- Tooltip explicatif sur "Relance IA" (pourquoi, quand l'utiliser).
- Si type = "written", masquer complètement la section enregistreur (au lieu de la laisser vide).
- Confirmation avant fermeture du dialog si modifications non sauvegardées.

### Question avant d'implémenter

Sur les 6 propositions, **lesquelles tu veux que je fasse maintenant** ?

- **A. Quick win (30 min)** — uniquement P1 (lecture médias depuis la liste) + P3 partiel (bouton "Refaire" + durée + upload fichier)
- **B. Refonte ciblée (1h)** — P1 + P2 (dialog restructuré + footer sticky) + P3 complet
- **C. Refonte complète (2h)** — tout : P1 → P6
- **D. Autre combinaison** — dis-moi lesquelles

Je recommande **B** : ça résout ton problème immédiat (lecture médias) + le risque récurrent du bouton Sauvegarder qui passe sous le pli + une vraie ergonomie sur l'enregistreur, sans aller jusqu'aux features secondaires (combobox catégorie, dupliquer, etc.) qu'on peut garder pour plus tard.

