## Objectif

Remplacer la concaténation actuelle des segments vidéo (qui produit un `.webm` cassé) par un téléchargement **ZIP** contenant un fichier vidéo par question, nommé proprement. Marche pour toutes les sessions, passées et futures, sans modification de l'enregistrement.

## Comportement attendu

Le RH clique sur "Télécharger la vidéo" dans le header de `/sessions/:id` :

1. Bouton désactivé + libellé "Préparation…" + spinner.
2. On récupère tous les segments vidéo de la session (réponses candidat, dans l'ordre des questions).
3. Chaque segment est téléchargé depuis le bucket Storage, puis ajouté à un ZIP construit côté navigateur.
4. Téléchargement automatique du fichier `entretien-{nom-candidat}-{date}.zip`.
5. En cas d'erreur sur un segment : on continue avec les autres, on inclut un `README.txt` qui liste les segments manquants, toast d'avertissement.
6. Si aucun segment n'existe : toast d'erreur, bouton réactivé.

## Contenu du ZIP

```
entretien-jean-dupont-2026-04-28.zip
├── 01-question-1.webm           (réponse candidat à Q1)
├── 02-question-2.webm
├── 03-question-2-relance-1.webm (si relance IA)
├── 04-question-3.webm
├── ...
└── README.txt                   (récap : nom candidat, date, projet, liste des fichiers, transcription si dispo)
```

Règles de nommage :
- Index séquentiel sur 2 chiffres (ordre chronologique strict via `timestamp`).
- `question-{N}` où N est l'index de la question (1-based) à laquelle le segment se rattache (`question_id` mappé sur `projects.questions.order_index`).
- Suffixe `-relance-{k}` si `is_follow_up = true` (k incrémenté par question).
- Extension dérivée du `Content-Type` réel du blob (`.webm` par défaut, `.mp4` si applicable).

Le `README.txt` contient :
- Nom + email candidat
- Titre du projet + poste
- Date de l'entretien + durée
- Liste ordonnée : `01-question-1.webm — "Pouvez-vous vous présenter ?"`
- Note expliquant que la voix de l'IA n'est pas dans les fichiers (limitation actuelle).

## Changements techniques

### Frontend uniquement

Aucune migration SQL, aucun edge function, aucun bucket nouveau. Tout se fait côté navigateur du recruteur à partir des `video_segment_url` déjà accessibles.

**Dépendance ajoutée** : `jszip` (≈ 100 Ko gzippé, lib standard pour ce besoin, pas de WebAssembly, pas de polyfill).

**Fichier modifié** : `src/pages/SessionDetail.tsx`

- Réécrire `handleDownloadFullVideo` :
  - Construire la liste des segments avec leurs métadonnées : `{ url, questionOrderIndex, isFollowUp, timestamp }` à partir de `messages` + `session.projects.questions`.
  - Trier par `timestamp` croissant.
  - Créer un `JSZip()`, télécharger les blobs en parallèle (avec `Promise.allSettled` pour tolérer les échecs partiels), `zip.file(name, blob)` pour chacun.
  - Générer le `README.txt` à partir de `session`, `report`, et de la liste des questions.
  - `zip.generateAsync({ type: "blob", compression: "STORE" })` (compression désactivée — la vidéo est déjà compressée, STORE évite de griller du CPU pour rien).
  - Déclencher le download via `<a>` programmatique (déjà en place).
- Renommer le libellé bouton inchangé : "Télécharger la vidéo" reste correct (le ZIP est un détail technique).
- Toast en cas d'échec partiel : "Téléchargé avec X segment(s) manquant(s)".

### Pas touché

- `sessions.video_recording_url`, le bucket de segments, l'edge function `ai-conversation-turn`, `tts-elevenlabs`, le flux d'enregistrement candidat dans `InterviewStart.tsx`.
- Aucun changement de schéma, aucune RLS, aucune nouvelle politique Storage.

## Limites assumées (à communiquer plus tard si besoin)

- La voix de l'IA n'est dans aucun fichier (le `MediaRecorder` candidat ne capture que webcam + micro). C'est documenté dans le README du ZIP.
- Pour les très longs entretiens (> 1 Go de vidéo cumulée), le ZIP est construit en mémoire navigateur. Si ça devient un problème, on basculera sur `StreamSaver.js` dans une itération ultérieure.
- Pas de fusion en une vidéo unique : c'est un choix court terme assumé, pour la qualité et la fiabilité.

## Fichiers touchés

- **Modifiés** :
  - `src/pages/SessionDetail.tsx` (handler `handleDownloadFullVideo` réécrit)
  - `package.json` (ajout `jszip`)
