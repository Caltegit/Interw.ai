## Objectif

Simplifier la page `/session/:slug/test/:token` pour la rendre linéaire et lisible : 3 écrans clairs à valider par le candidat, et tout le reste (navigateur, réseau, STT) qui tourne silencieusement en arrière-plan.

## Nouveau parcours candidat

```text
[Écran 1 — Micro]           [Écran 2 — Haut-parleur]    [Écran 3 — Caméra]         [Écran 4 — Récap auto]
Phrase à lire affichée      Bouton "Tester le son"       Aperçu caméra plein cadre  Tout est vert → on
+ bouton "Tester mon micro" → bip → "Oui j'ai entendu"   + "Je suis bien cadré"     enchaîne automatiquement
        ▼                              ▼                          ▼                          ▼
   testMicAndRecorder              testSound                 (visuel uniquement)         handleContinue()
```

En **tâche de fond**, dès le montage de la page :
- détection navigateur (instantané)
- pré-acquisition caméra (pour que l'écran 3 s'affiche déjà actif)
- test réseau
- test STT

→ Visibles uniquement si **erreur bloquante** (intercalées en pré-récap, comme aujourd'hui pour STT).

## Refonte UI (`src/pages/InterviewDeviceTest.tsx`)

### Step machine — nouvelle séquence

```ts
type Step = "mic" | "sound" | "camera" | "recap";
// + "browser" / "stt" / "network" intercalés UNIQUEMENT si erreur bloquante
```

Ordre dynamique :
```text
mic → sound → camera → (browser si bloqué) → (stt si error) → (network si weak) → recap
```

Barre de progression : 3 segments visibles (mic / sound / camera). Si un blocage tombe, on insère un segment rouge avant `recap`.

### Écran 1 — Micro (idem actuel mais plus de démarrage auto)

- Supprimer le `testMicAndRecorder(selectedAudioId)` automatique du `useEffect` de boot (ligne 562). Garder uniquement la query des permissions.
- Carte plein cadre : phrase encadrée + bouton primaire "Tester mon micro" (l'animation `animate-ping` actuelle est conservée).
- Pendant `testing` : phrase mise en évidence + vu-mètre + countdown (déjà en place).
- En `ok` : auto-avance après 800 ms (déjà câblé via `stepAdvanceTimer`).

### Écran 2 — Haut-parleur (existant, légèrement allégé)

- Carte plein cadre avec bouton primaire "Tester le son", message court "Vous devez entendre un bip".
- Après lecture : "Oui j'ai entendu" / "Non" (existant).
- En `ok` : auto-avance.

### Écran 3 — Caméra (nouveau, plein cadre)

- Carte plein largeur avec **vidéo grande** (≈ 4:3, ~`aspect-video sm:aspect-[4/3]`, miroir `scaleX(-1)`).
- Légère sur-impression d'un cadre indicatif pour aider à se centrer (overlay simple, juste un rectangle pointillé centré).
- Texte court : « Vérifiez que votre visage est bien dans le cadre, bien éclairé. »
- Bouton primaire « Je suis bien cadré » → marque la step comme `ok` et auto-avance.
- Si la caméra n'a pas pu démarrer (`camStatus === "error"`) : message + bouton « Activer la caméra » qui relance `testCam(selectedVideoId)`. Bouton « Je suis bien cadré » désactivé tant que pas de flux.
- La vignette caméra du header actuel (lignes 837-895) est **supprimée** (devient redondante). Le bandeau d'en-tête se réduit au titre + progression.

### Écrans intercalés (uniquement en cas d'erreur bloquante, juste avant le récap)

- `browser` (level=blocked) : inchangé, message + copier le lien.
- `stt` (status=error) : inchangé, bloque.
- `network` (quality=weak) : inchangé, propose de refaire.

Si tout est vert → on passe direct au récap, qui auto-continue après 1.2 s (déjà câblé, ligne 703-711).

## Détails techniques

### `useEffect` de boot (ligne 552-583)

Avant :
```ts
await testMicAndRecorder(selectedAudioId);
await testCam(selectedVideoId);
testNetwork();
testStt();
```

Après :
```ts
// micro : NE PAS lancer auto, attendre le clic candidat
await testCam(selectedVideoId);  // précharger le flux pour l'écran 3
testNetwork();                    // tâche de fond
testStt();                        // tâche de fond
```

`micStatus` reste `"idle"` jusqu'au clic, ce qui fait que l'étape 1 s'affiche dans son état "phrase à lire + bouton" comme aujourd'hui en idle.

### `currentStep` initial

Passer de `"browser"` à `"mic"` (le navigateur n'est plus une étape sauf si bloqué).

### `stepOrder`

```ts
const stepOrder = useMemo(() => {
  const base: Step[] = ["mic", "sound", "camera"];
  if (browserCompat.current.level === "blocked") base.push("browser"); // étape bloquante
  if (sttStatus === "error") base.push("stt");
  if (networkBlocking) base.push("network");
  base.push("recap");
  return base;
}, [sttStatus, networkBlocking]);
```

### `canContinue`

Inchangé sur le fond, mais sans `camStatus === "ok"` strict bloquant (la caméra est validée manuellement via une nouvelle step). On garde la condition technique `camStatus === "ok"` pour le récap (sinon on n'a pas de flux à afficher en entretien).

### Validation manuelle caméra

Ajouter `const [cameraConfirmed, setCameraConfirmed] = useState(false)` et l'inclure dans `canContinue`. Le bouton de l'écran 3 fait `setCameraConfirmed(true)` + `goToNextStep()`.

### Auto-avance & CTA

- Pour `mic` et `sound` : auto-avance sur `ok` (existant).
- Pour `camera` : pas d'auto-avance, attendre le clic.
- CTA bas inchangé (« Étape suivante » désactivé, ou « C'est parti » sur récap).

### Header

- Supprimer la vignette caméra (lignes 836-897).
- Garder titre + sous-titre + barre de progression (3 segments visibles + segments intercalés rouges si blocage).
- Garder le « Passer » / compteur.

## Hors scope

- Pas de changement du moteur de mesure (`measureMicLevel`, seuils, etc.).
- Pas de changement du logging `session_attempts`.
- Pas de changement de `InterviewStart.tsx` (la garde côté session reste).
- Pas de changement du parcours mobile vs desktop : on garde le même layout responsive.

## Vérification

1. Ouvrir `/session/<slug>/test/<token>` → on doit voir l'écran 1 (phrase + bouton « Tester mon micro »), **rien ne démarre tout seul**.
2. Cliquer → countdown + vu-mètre + auto-passage à l'écran 2.
3. Écran 2 « Tester le son » → bip → « Oui j'ai entendu » → auto-passage à l'écran 3.
4. Écran 3 caméra plein cadre, miroir, bouton « Je suis bien cadré » → récap → auto « C'est parti ».
5. Forcer une erreur (couper le wifi pendant le boot) → l'étape « Connexion » s'intercale entre caméra et récap.
6. Désactiver le micro avant le test → message d'erreur explicite + « Réessayer », pas de skip.
