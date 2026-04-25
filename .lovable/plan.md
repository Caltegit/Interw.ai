## Objectif

Produire un fichier MP4 de **45 secondes**, **1920×1080**, livré dans `/mnt/documents/`, expliquant les 4 étapes de création d'une session sur la plateforme, avec voix off française générée par ElevenLabs (voix Charlotte).

C'est un livrable one-shot (pas une feature ajoutée à l'app). Tout le code Remotion vit dans un dossier `remotion/` à la racine et n'est pas compilé dans l'app web.

## Direction artistique

- **Palette** alignée sur la landing : fond `#0F0F10` (l-bg), accent `#d4a574` (l-accent doré), texte `#F5F0E8`. Maquettes d'écrans en cartes sombres avec bordures `rgba(245,240,232,0.12)`.
- **Typo** : Inter (déjà la font du projet) chargée via `@remotion/google-fonts/Inter`.
- **Aesthetic** : "Tech Product" — cartes UI propres, transitions snappy, micro-parallaxe, accent doré pour les CTA et highlights.
- **Motion system** : entrées en spring (damping 18) avec petit translateY, sorties en fade+blur, transitions de scène en `slide`/`wipe` du package `@remotion/transitions`.

## Structure (45s à 30fps = 1350 frames)

| Scène | Durée | Contenu visuel | Voix off (FR) |
|---|---|---|---|
| Hook | 3s | Logo "Interw" + tagline "Créez une session en 4 étapes" | "Créez votre première session d'entretien en quatre étapes." |
| Étape 1 — Poste & IA | 9s | Maquette wizard step 1 : champ "Intitulé du poste" qui se remplit (typewriter "Product Manager"), avatar IA Marie qui apparaît, badge "Voix Charlotte" | "Étape une : décrivez le poste et choisissez votre recruteur IA. Donnez-lui une voix, un visage, une personnalité." |
| Étape 2 — Questions | 9s | Maquette step 2 : 3 cartes question qui s'empilent en stagger, bouton "Bibliothèque" qui pulse | "Étape deux : ajoutez vos questions. Piochez dans la bibliothèque ou créez les vôtres." |
| Étape 3 — Critères | 9s | Maquette step 3 : 3 critères avec sliders de pondération qui s'animent jusqu'à 35/35/30%, total qui compte jusqu'à 100% | "Étape trois : définissez vos critères d'évaluation et leur pondération. L'IA notera chaque candidat selon vos exigences." |
| Étape 4 — Partage | 9s | Maquette step 4 : URL `interw.ai/session/...` qui apparaît, icône "copier", puis preview d'un rapport candidat avec score | "Étape quatre : partagez le lien à vos candidats. Vous recevez un rapport détaillé après chaque entretien." |
| Outro | 6s | Logo + "Prêt en 10 minutes." + URL `interw.ai` | "Prêt en dix minutes. Interw point AI." |

Total parlé ≈ 42s, marge de respiration de 3s.

## Pipeline technique

### 1. Génération de la voix off (avant Remotion)

- Script Node qui appelle directement l'API ElevenLabs (clé `ELEVENLABS_API_KEY` déjà disponible dans le projet via `fetch_secrets` — utilisée par la fonction `tts-elevenlabs` existante).
- Voice ID : `XB0fDUnXU5powFXDhCwa` (Charlotte, déjà default du projet).
- Modèle : `eleven_multilingual_v2`, format `mp3_44100_128`.
- Une requête par scène (5 segments) + outro pour pouvoir caler chaque ligne sur sa scène.
- Fichiers sauvegardés dans `remotion/public/voiceover/scene-1.mp3` … `scene-6.mp3`.
- `ffprobe` (déjà installé) pour mesurer la durée réelle de chaque MP3 et ajuster `durationInFrames` de chaque scène si besoin.

### 2. Setup Remotion

- `mkdir -p remotion && cd remotion && bun init -y`
- Install : `remotion @remotion/cli @remotion/renderer @remotion/bundler @remotion/compositor-linux-x64-musl @remotion/transitions @remotion/google-fonts react react-dom typescript @types/react`
- Patch compositor gnu → musl (NixOS) + symlinks ffmpeg/ffprobe (procédure standard du skill).
- `tsconfig.json` avec `jsx: react-jsx`, `module: Preserve`.

### 3. Composants Remotion

```
remotion/src/
  index.ts                  # registerRoot
  Root.tsx                  # <Composition id="main" .../>
  MainVideo.tsx             # <TransitionSeries> + <Audio> par scène
  scenes/
    SceneHook.tsx
    SceneStep1Poste.tsx
    SceneStep2Questions.tsx
    SceneStep3Criteres.tsx
    SceneStep4Partage.tsx
    SceneOutro.tsx
  components/
    BrowserChrome.tsx       # Cadre navigateur avec 3 dots + URL
    WizardStepBar.tsx       # Barre de progression 1/4 → 4/4
    QuestionCard.tsx
    CriterionRow.tsx        # Avec slider animé
    BackgroundGradient.tsx  # Fond persistant avec léger drift
```

Toutes les animations via `useCurrentFrame()` + `interpolate()`/`spring()`, jamais de CSS transitions.

### 4. Render

- Script `remotion/scripts/render-remotion.mjs` (template du skill avec `chromeMode: "chrome-for-testing"`, `muted: false` pour conserver l'audio voix off, `concurrency: 1`).
- Sortie : `/mnt/documents/tutoriel-creation-session.mp4`.
- Frame check `bunx remotion still` à mi-parcours de chaque scène avant render final pour vérifier la mise en page.

### 5. QA

- Vérifier la durée finale avec `ffprobe`.
- Extraire 6 frames (une par scène) en PNG et les inspecter pour valider qu'aucun texte ne déborde et que les éléments clés sont bien lisibles.
- Reporter taille du fichier + chemin dans `<lov-artifact>`.

## Hypothèses

- La clé `ELEVENLABS_API_KEY` est bien présente comme secret d'edge function (sera vérifiée via `fetch_secrets` au début).
- Pas de musique de fond (la voix off porte le tutoriel ; ajout possible en V2 si tu veux).
- Pas d'utilisation de captures d'écran réelles : 100% maquettes recréées en JSX.
- Le tutoriel reste générique (pas de capture d'un projet existant en base).

## Risques & mitigations

- **Dépassement timeout render (10 min max).** Mitigation : `concurrency: 1`, pas de `backdropFilter`, blurs limités, 1350 frames seulement.
- **Voix trop longue/courte par rapport aux 9s/scène.** Mitigation : on mesure chaque MP3 avec `ffprobe` après génération et on ajuste `durationInFrames` de la scène correspondante avant render.
- **Coût ElevenLabs.** ~600 caractères de script total, coût négligeable.

## Livrable final

- `tutoriel-creation-session.mp4` dans `/mnt/documents/` (≈ 45s, 1920×1080, H.264 + audio AAC).
- Sources Remotion conservées dans `remotion/` pour itérations futures (changement de script, voix, durée).
