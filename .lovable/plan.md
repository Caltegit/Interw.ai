

## Plan — ElevenLabs en option par projet (toggle off par défaut)

### Concept

Le toggle **"Voix premium ElevenLabs"** apparaît au **Step 1 du wizard de création de projet** (à côté des autres réglages voix IA). Off par défaut → la voix navigateur reste utilisée. Activable projet par projet pour que tu maîtrises ta consommation.

---

### Modifications

**1. Base de données — table `projects`**
- Nouvelle colonne `tts_provider` (text, défaut `'browser'`, valeurs : `'browser'` | `'elevenlabs'`)
- Nouvelle colonne `tts_voice_id` (text, nullable, défaut `'XB0fDUnXU5powFXDhCwa'` Charlotte FR)
- Pas de migration de données (les projets existants restent en `'browser'`)

**2. Secret `ELEVENLABS_API_KEY`**
- Demandé via outil sécurisé après approbation
- Tu crées un compte sur elevenlabs.io → API Keys → copie `sk_...`
- Plan gratuit (10k chars/mois ≈ 4 entretiens) suffisant pour tester

**3. Edge function `tts-elevenlabs` (nouvelle)**
- `verify_jwt = false` (candidats non authentifiés)
- Reçoit `{ text, projectId }`
- Vérifie côté serveur que `project.tts_provider = 'elevenlabs'` (sécurité : un client ne peut pas forcer la consommation)
- Si non → renvoie 200 avec `{ skip: true }` (le client tombera sur la voix navigateur)
- Sinon → stream MP3 ElevenLabs (`eleven_turbo_v2_5`, voix Charlotte, format `mp3_44100_128`)
- Erreur API/quota → renvoie `{ skip: true }` (fallback automatique, l'entretien continue)

**4. UI Step 1 du wizard (`src/pages/ProjectNew.tsx` + composants associés)**
Dans la section "Voix de l'IA" / réglages avancés du Step 1 :
- **Toggle Switch** : « Voix premium ElevenLabs » (off par défaut)
- Description sous le toggle : « Voix réaliste haute qualité (~0,40 € par entretien). Si désactivé, voix standard du navigateur (gratuit). »
- Visible aussi dans `ProjectEdit.tsx` pour modifier après création

**5. Frontend `src/pages/InterviewStart.tsx`**
- Au démarrage, lit `project.tts_provider`
- `speak()` modifié :
  - Si `'elevenlabs'` → `fetch` edge function → lit le MP3 via `new Audio(blobUrl)`
  - Si réponse `{ skip: true }` ou erreur réseau → fallback `window.speechSynthesis`
  - Si `'browser'` → directement `window.speechSynthesis` (existant intact)
- Toute la logique pause/resume/safety timer/`currentPresentationRef`/`isSpeaking` préservée

---

### Architecture

```text
Création projet
  └─ Step 1 → Toggle "Voix premium" [OFF par défaut]
              └─ projects.tts_provider = 'browser' | 'elevenlabs'

Candidat démarre
  └─ Charge project.tts_provider
       └─ speak("Bonjour...")
            ├─ provider = 'elevenlabs' ?
            │    ├─ fetch /tts-elevenlabs (vérifie côté serveur)
            │    │    ├─ MP3 stream → new Audio().play()
            │    │    └─ erreur → fallback browser
            │    └─ skip → fallback browser
            └─ 'browser' → window.speechSynthesis (existant)
```

---

### Hors scope

- Pas de choix de voix multiples (Charlotte FR uniquement pour V1)
- Pas de compteur de caractères consommés (V2 quand monétisation)
- Pas de paywall (toggle libre pour l'instant)
- Pas de cache des audios générés

---

### Étapes d'exécution une fois approuvé

1. Migration DB : ajout `tts_provider` + `tts_voice_id` sur `projects`
2. Demande de la clé `ELEVENLABS_API_KEY`
3. Création edge function `tts-elevenlabs` + entrée `config.toml`
4. Toggle dans Step 1 wizard (`ProjectNew.tsx`) + miroir dans `ProjectEdit.tsx`
5. Modification `speak()` dans `InterviewStart.tsx` avec fallback
6. Test bout-en-bout côté candidat (toggle off → voix navigateur ; toggle on → voix ElevenLabs)

