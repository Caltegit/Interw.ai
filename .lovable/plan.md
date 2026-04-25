## Objectif

Remplacer la sélection actuelle « top 3 par score, 20 premières secondes » par une sélection pilotée par l'IA, qui choisit **3 moments significatifs et variés** avec des **bornes temporelles précises**.

## Logique actuelle (à remplacer)

Dans `supabase/functions/generate-report/index.ts` (l. 463-498) :
- Tri des questions par score décroissant.
- Récupération des 3 meilleures vidéos.
- Coupe systématique aux 20 premières secondes (`max_seconds: 20`), ce qui peut tomber au milieu d'une phrase ou rater le moment intéressant.
- Aucune diversité : si les 3 meilleures réponses se ressemblent, le best-of est plat.

## Nouvelle logique

### 1. Demander à l'IA de désigner 3 moments — `generate-report/index.ts`

Ajouter au prompt envoyé à l'IA un nouveau bloc qui retourne un tableau `highlights` avec **3 entrées variées** :

```json
"highlights": [
  {
    "question_index": 2,
    "kind": "force",          // force | personnalité | vigilance
    "label": "Exemple concret de leadership",
    "start_seconds": 12,
    "end_seconds": 38,
    "why": "Le candidat illustre par un cas vécu et chiffré."
  },
  ...
]
```

Contraintes données à l'IA dans le prompt :
- Toujours retourner **3 entrées** si possible.
- **Diversifier** les `kind` : idéalement 1 force, 1 trait de personnalité, 1 point de vigilance (ou meilleure réponse de chaque type si pas de vigilance).
- `start_seconds` / `end_seconds` doivent encadrer un extrait **entre 10 et 30 secondes**.
- S'appuyer sur la transcription (déjà fournie au prompt) pour situer le moment fort dans la réponse.

### 2. Côté code, mapper ces highlights aux vidéos

Remplacer la boucle actuelle (l. 480-498) par :
- Pour chaque entrée IA, retrouver la vidéo via `question_index` (puis fallback `question_id`).
- Construire l'objet sauvegardé :
  ```ts
  {
    video_url, question, score,
    question_index,
    kind, label, why,
    start_seconds, end_seconds,
  }
  ```
- **Fallback** si l'IA ne renvoie rien d'exploitable : conserver l'ancienne logique (top 3 par score, 0–20 s) pour ne jamais avoir un best-of vide.
- Validation : ignorer les bornes incohérentes (`end <= start`, durée > 60 s) et tomber sur 0–20 s.

### 3. Lecteur — `src/components/session/HighlightReelPlayer.tsx`

- Étendre `HighlightClip` avec `start_seconds`, `end_seconds`, `kind`, `label`, `why`.
- Au passage à un clip : `video.currentTime = start_seconds`, lecture jusqu'à `end_seconds` (au lieu de `max_seconds` fixe à 20).
- Afficher dans le badge le `label` IA (ex. « Exemple concret de leadership ») et un petit pictogramme par `kind` (force / personnalité / vigilance).
- Sous la vidéo, afficher la phrase `why` pour donner du contexte au recruteur.

### 4. Page partagée — `src/pages/SharedReport.tsx`

Aucun changement structurel : le composant `HighlightReelPlayer` reçoit déjà les nouveaux champs via `report.highlight_clips`.

### 5. Compatibilité ascendante

Les rapports déjà générés n'ont pas `start_seconds` / `end_seconds` / `kind` : le lecteur retombe sur l'ancien comportement (lecture de 0 à `max_seconds ?? 20`). Aucune migration de données nécessaire.

## Fichiers modifiés

- `supabase/functions/generate-report/index.ts` — nouveau bloc `highlights` dans le prompt + mapping vers vidéos + fallback.
- `src/components/session/HighlightReelPlayer.tsx` — lecture entre `start_seconds` et `end_seconds`, affichage `label` + `why` + `kind`.

## Vérification

- Générer un rapport sur une session existante : les 3 clips doivent désormais démarrer à un moment pertinent (pas systématiquement à 0 s).
- Vérifier la diversité : si la session contient une vraie faiblesse, elle apparaît comme `vigilance`.
- Session sans transcription suffisante : fallback automatique → 3 meilleurs scores, 0–20 s, comme aujourd'hui.
- Anciens rapports : le lecteur fonctionne sans régression.
