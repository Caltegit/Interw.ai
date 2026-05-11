# Analyse audio des entretiens

Objectif : enrichir le rapport IA avec une analyse para-verbale (débit, hésitations, intonation, énergie, stress vocal, confiance) en envoyant l'audio des réponses candidat à Gemini, en plus du texte.

## 1. Fonction `generate-report` — appel multimodal

Aujourd'hui : appel via AI Gateway Lovable, prompt 100% texte.
Cible : appel direct Gemini 2.5 Pro avec audio + texte.

### a. Récupération des audios
- Pour chaque `session_messages` candidat avec `audio_segment_url` (ou `video_segment_url` en fallback) :
  - Générer une signed URL (bucket privé)
  - Télécharger le blob côté edge function

### b. Upload vers Gemini Files API
- Utiliser l'endpoint `https://generativelanguage.googleapis.com/upload/v1beta/files` (resumable upload)
- Récupérer le `file.uri` retourné pour chaque segment
- Avantage Files API vs `inlineData` : pas de limite 20 Mo, pas d'explosion du payload base64, fichiers réutilisables 48h

### c. Construction du prompt multimodal
Format Gemini natif :
```
contents: [{
  role: "user",
  parts: [
    { text: "Question 1: ..." },
    { fileData: { mimeType: "audio/webm", fileUri: "<uri Q1>" } },
    { text: "Transcription Q1: ..." },
    ...
    { text: "<prompt analyse + critères + grille>" }
  ]
}]
```

### d. Bascule du transport
- Remplacer `ai.gateway.lovable.dev` par `generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent` pour cet appel uniquement (les autres fonctions IA restent sur le gateway)
- Conserver le mécanisme de tool calling (`functionDeclarations` côté Gemini natif, schéma identique)

### e. Mode asynchrone
- L'appel multimodal sur 30 min d'audio peut prendre 60-120 s → dépasse la limite edge function
- Workflow : marquer `reports.status = 'generating'` (champ à ajouter), retourner immédiatement, traiter via background task (`EdgeRuntime.waitUntil`)
- Côté UI : polling existant sur `reports`, afficher un état "Analyse audio en cours…"

## 2. Schéma de sortie enrichi

Étendre l'outil `generate_report` avec un nouveau bloc :

```
paraverbal_profile: {
  fluency:    { score 0-10, comment, evidence_message_id }   // débit, fluidité
  hesitation: { score 0-10, comment, evidence_message_id }   // "euh", reprises
  intonation: { score 0-10, comment, evidence_message_id }   // monotone vs vivante
  energy:     { score 0-10, comment, evidence_message_id }   // dynamisme vocal
  vocal_confidence: { score 0-10, comment, evidence_message_id }
  vocal_stress:     { score 0-10, comment, evidence_message_id }
}
```

Stockage : champ JSON existant `reports.stats` ou nouveau champ `reports.paraverbal_analysis jsonb` (préférable pour requêtes futures). Migration légère.

Adapter le `systemPrompt` pour expliciter à Gemini qu'il reçoit l'audio en plus du texte et doit s'appuyer dessus pour cette section.

## 3. Activation projet (optionnel mais recommandé)

Ajouter `projects.audio_analysis_enabled boolean default false` (migration) pour :
- Permettre une activation par projet (coût +15%)
- Afficher un toggle dans les paramètres projet
- La fonction `generate-report` lit ce flag pour décider d'utiliser le mode multimodal ou le mode texte actuel

Si flag `false` ou aucun audio dispo → comportement actuel inchangé.

## 4. UI rapport

- **`SessionDetail.tsx`** / **`SharedReport.tsx`** : nouvelle section "Communication orale" avec les 6 jauges para-verbales (réutiliser le composant de jauge déjà utilisé pour `communication_profile`)
- Tooltip sur chaque score avec le commentaire IA
- Bouton "Écouter l'extrait" qui ouvre la vidéo au timecode si `evidence_message_id` est fourni
- Section masquée si `paraverbal_profile` absent (rétrocompatibilité)

## 5. Gestion d'erreurs

- Échec upload Files API d'un segment → continuer sans cet audio, log
- Échec Gemini multimodal complet → fallback automatique sur l'analyse texte actuelle, marquer `reports.paraverbal_analysis = null`
- Quota Gemini dépassé → idem fallback
- Audio manquant pour ≥50% des messages → fallback texte direct sans tenter le multimodal

## 6. Ordre d'implémentation

1. Migration : `reports.paraverbal_analysis jsonb`, `projects.audio_analysis_enabled boolean`
2. Secret : ajouter `GEMINI_API_KEY` (clé Google AI Studio) — nécessaire pour Files API + appel direct
3. Refactor `generate-report` : helpers d'upload Files API + branche multimodale
4. Mode async + champ `reports.status` (si pas déjà géré)
5. Toggle dans `ProjectSettings`
6. Section UI rapport
7. Test bout-en-bout sur une session existante avec audio

## Détails techniques annexes

- **Format audio** : WebM/Opus déjà capturé, supporté nativement par Gemini, aucun transcodage
- **Coût** : ~+0,10 $ par entretien de 30 min (vs ~0,80 $ aujourd'hui)
- **Latence** : rapport disponible en 60-120 s vs ~20 s aujourd'hui (d'où le mode async)
- **Sécurité** : signed URLs courtes durée, Files API nettoie les fichiers après 48h automatiquement
- **Pas d'impact** sur le flux candidat (capture, upload, transcription) — tout est déjà en place

## Hors scope

- Analyse vidéo (sourires, regard, posture) → autre chantier, ~2× le coût
- Transcription par locuteur séparé (Whisper diarize) → déjà géré côté `transcribe-session`
- Détection d'émotions par modèle dédié (Hume, etc.) → non nécessaire, Gemini multimodal suffit
