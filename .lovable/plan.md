

## Plan : Renommer "Pré" → "Intro" + déplacer Persona/Avatar dans "Informations"

### Changements

**1. Renommer l'étape "Pré" → "Intro"**
Dans `src/pages/ProjectNew.tsx` et `src/pages/ProjectEdit.tsx`, ligne 20 :
```ts
const STEPS = ["Informations", "Intro", "Questions", "Critères", "Publication"];
```

**2. Déplacer "Nom du persona IA" + "Photo du recruteur" de l'étape "Intro" (step 1) vers "Informations" (step 0)**

Dans les deux fichiers :
- Step 0 (Informations) devient : Titre · Langue · **Nom du persona IA** · **Photo du recruteur**
- Step 1 (Intro) ne contient plus que : sélecteur Audio/Vidéo + enregistreur d'intro + bibliothèque

**3. Améliorer l'interface de l'étape "Intro"**
- Titre + courte description en tête : "Message d'introduction" / "Cette intro sera diffusée au candidat avant le début des questions."
- Regrouper le sélecteur de type (Audio/Vidéo) et le recorder dans une seule carte propre avec un peu plus d'espacement.
- Bouton "Choisir depuis la bibliothèque" mieux placé (en haut à droite de la carte, déjà le cas — on garde mais on uniformise le padding).
- Petit hint sous le recorder : "Astuce : enregistrez une intro chaleureuse pour mettre le candidat à l'aise."

### Fichiers modifiés
- `src/pages/ProjectNew.tsx` — STEPS, contenu step 0, contenu step 1
- `src/pages/ProjectEdit.tsx` — mêmes changements (mêmes blocs JSX)

### Test
1. Aller sur `/projects/new` → vérifier que l'étape s'appelle "Intro" et que **Nom du persona** + **Avatar** apparaissent dans l'étape **Informations**.
2. Vérifier que l'étape "Intro" affiche uniquement le message audio/vidéo, avec l'UI améliorée.
3. Créer un projet → vérifier que les données sont bien sauvegardées (persona_name, avatar_url, intro audio/vidéo).
4. Éditer un projet existant (`/projects/:id/edit`) → mêmes vérifications.

