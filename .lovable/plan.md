

## Plan — Remplacer la voix navigateur par ElevenLabs (vraie voix réaliste)

### Constat

Aujourd'hui, contrairement à ce qu'on a pu dire, ton projet **n'utilise PAS ElevenLabs**. Tu utilises `window.speechSynthesis`, la voix native du navigateur (Chrome/Safari/Firefox). C'est pour ça que la voix sonne robotique : elle dépend du système d'exploitation du candidat (Windows = très métallique, macOS = correct, Linux = catastrophique).

Passer à ElevenLabs = saut qualitatif énorme, voix vraiment humaine et chaleureuse en français.

---

### Ce qu'on va faire

**1. Edge function `tts-elevenlabs`** (nouvelle)
- Reçoit `{ text, voiceId? }` du front
- Appelle `https://api.elevenlabs.io/v1/text-to-speech/{voiceId}/stream` avec `model_id: eleven_turbo_v2_5` (faible latence, multilingue, parfait pour le français)
- Streame le MP3 directement au navigateur (pas de base64, pas de stockage)
- Voix par défaut : **Charlotte** (féminine française, chaleureuse) — paramétrable côté projet plus tard

**2. Modifier `speak()` dans `src/pages/InterviewStart.tsx`**
- Remplacer `SpeechSynthesisUtterance` par un `fetch()` vers l'edge function
- Lecture via un `HTMLAudioElement` (`new Audio(blobUrl)`)
- Garder toute la logique existante : pause/resume, safety timer, manual continue, tracking `currentPresentationRef`
- Fallback automatique vers `window.speechSynthesis` si l'edge function échoue (réseau, quota)

**3. Toggle qualité voix dans l'UI candidat**
- Bouton existant `ttsEnabled` reste
- Aucun changement visible côté recruteur

**4. Secret requis**
- `ELEVENLABS_API_KEY` — à créer (tu n'as actuellement que `LOVABLE_API_KEY`)
- Inscription gratuite sur elevenlabs.io → dashboard → API key
- Plan gratuit : 10 000 caractères/mois (~10-15 entretiens). Plan Starter $5/mois : 30 000 car (~50 entretiens)

---

### Paramètres voix retenus (français naturel)

```
model_id: eleven_turbo_v2_5
voice_id: XB0fDUnXU5powFXDhCwa  (Charlotte FR)
voice_settings: {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.3,
  use_speaker_boost: true,
  speed: 1.0
}
```

Latence attendue : **~400-600ms** time-to-first-byte (vs instantané pour la voix navigateur, mais vs voix robotique vs voix humaine, le compromis est largement gagnant).

---

### Hors scope

- Pas de choix de voix par projet (V2 si tu veux)
- Pas de cache des audios (chaque tour est généré à la demande, c'est négligeable en coût)
- Pas de changement sur les questions audio/vidéo pré-enregistrées (elles continuent de jouer leur fichier média)
- Pas d'avatar visuel HeyGen (sujet séparé)

---

### Étapes d'exécution une fois approuvé

1. Je te demande la clé `ELEVENLABS_API_KEY` via l'outil sécurisé
2. Je crée l'edge function `tts-elevenlabs`
3. Je modifie `speak()` dans `InterviewStart.tsx` avec fallback
4. Tu testes un entretien candidat de bout en bout

