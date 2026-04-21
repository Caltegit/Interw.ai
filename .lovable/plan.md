

## Plan — Sélecteur de voix ElevenLabs avec test audio

### Concept

Simplification du plan précédent : pas de réglages avancés (stability/style/etc), juste **genre + sélection de voix ElevenLabs** avec aperçu audio. Modèle figé sur `eleven_turbo_v2_5`.

---

### Modifications

**1. Base de données — table `projects`**

Une seule nouvelle colonne :
- `tts_voice_gender` (text, défaut `'female'`, valeurs `'female'` | `'male'`)

`tts_voice_id` existe déjà (défaut Charlotte FR).

**2. UI Step 1 du wizard (`ProjectNew.tsx`) + `ProjectEdit.tsx`**

Dans la section voix IA, **avant** le toggle ElevenLabs :

- **Radio group "Genre de la voix"** : ⦿ Femme  ⦿ Homme (Femme par défaut)
  - Quand on change le genre, `tts_voice_id` est réinitialisé à la voix par défaut du genre (Charlotte pour Femme, George pour Homme)

- **Toggle "Voix premium ElevenLabs"** (existant, OFF par défaut)

- **Quand le toggle passe à ON** → ouvre automatiquement une **Dialog** "Choisir la voix ElevenLabs" :
  - **Dropdown (Select)** filtré selon le genre choisi :
    - Si Femme : Charlotte (FR) ✨ défaut, Sarah, Alice, Matilda, Lily, Jessica, Laura
    - Si Homme : George ✨ défaut, Liam, Brian, Daniel, Will, Eric, Chris
  - **Bouton "🔊 Tester cette voix"** → joue la phrase :
    > « Bonjour, je suis {ai_persona_name} et je suis ravi que vous choisissiez ma voix pour l'entretien. »
  - **Boutons** : "Annuler" / "Valider"
  - Si Annuler → toggle revient à OFF
  - Si Valider → `tts_voice_id` sauvegardé, toggle reste ON

- Une fois validé, un petit lien "Modifier la voix" sous le toggle rouvre la dialog.

**3. Edge function `tts-elevenlabs` — mise à jour mineure**

- Accepter un mode `preview: true` dans le body :
  - Reçoit `{ text, voiceId, preview: true }` (sans `projectId`)
  - Bypasse la vérification `tts_provider === 'elevenlabs'` (pour permettre le test avant sauvegarde)
  - Réservé aux utilisateurs authentifiés (vérification JWT côté fonction)
- Mode normal inchangé : `{ text, projectId }` → lit `tts_voice_id` de la BDD
- Modèle reste `eleven_turbo_v2_5` (pas de changement)

**4. Frontend `InterviewStart.tsx`**

Aucun changement — la voix sélectionnée est lue automatiquement par l'edge function depuis `projects.tts_voice_id`.

---

### Architecture

```text
Step 1 wizard
  ├─ Genre voix : ⦿ Femme  ○ Homme
  └─ Toggle "Voix premium ElevenLabs" [OFF]
        ↓ activation
        ┌─────────────────────────────┐
        │ Dialog "Choisir la voix"    │
        │  Voix : [Charlotte FR ▼]    │
        │  [🔊 Tester cette voix]      │
        │         ↓                    │
        │   POST /tts-elevenlabs       │
        │   { text, voiceId,           │
        │     preview: true }          │
        │         ↓                    │
        │   MP3 stream → audio.play()  │
        │                              │
        │  [Annuler]  [Valider]        │
        └─────────────────────────────┘
```

---

### Hors scope

- Pas de réglages stability/style/speed (valeurs fixes actuelles)
- Pas de choix de modèle (turbo v2.5 figé)
- Pas de clonage de voix
- Pas de compteur de consommation

---

### Étapes d'exécution

1. Migration DB : ajout colonne `tts_voice_gender` sur `projects`
2. Création composant `src/components/project/VoiceSelectorDialog.tsx`
3. Intégration radio genre + toggle + dialog dans `ProjectNew.tsx` (Step 1) et `ProjectEdit.tsx`
4. Mise à jour edge function `tts-elevenlabs` pour le mode `preview`
5. Test : changer genre, activer toggle, tester chaque voix, valider, démarrer entretien candidat

