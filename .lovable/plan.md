
## Objectif

Quand un entretien est majoritairement silencieux (micro coupé / inaudible), ne pas afficher une note trompeuse mais signaler clairement le problème dans le rapport.

## Règle de déclenchement

Un entretien est marqué **« Audio défaillant »** si :
- **plus de 80 %** des segments de réponses candidat sont silencieux/inaudibles,
- OU le `peak_rms` moyen pondéré < 0.05,
- OU plus de 80 % des transcriptions candidat sont vides ou < 5 caractères.

(Le 3ᵉ critère permet de couvrir les sessions passées qui n'auront pas les métriques RMS — on se base alors sur la transcription.)

## Ce qui change dans l'app

### 1. Métriques pendant l'entretien (léger)
- Nouveau module `src/lib/audioQualityWatcher.ts` : échantillonne le RMS via `AnalyserNode` pendant chaque réponse candidat (réutilise les seuils de `src/lib/micLevel.ts`).
- À la fin de chaque réponse, agrège `{ peak_rms, active_ratio, silence_ms, duration_ms, track_muted_events }` et le stocke dans `session_messages.audio_quality` (jsonb, nouvelle colonne).
- Intégration dans `src/pages/InterviewStart.tsx` uniquement — **aucun bandeau temps réel** (le système existant 6 s / 12 s / 20 s suffit, comme discuté).

### 2. Verdict côté serveur (`generate-report`)
- Dans `supabase/functions/generate-report/index.ts`, calcule un `audio_health` agrégé :
  ```json
  {
    "verdict": "ok" | "degraded" | "failed",
    "silent_ratio": 0.87,
    "affected_questions": [{ "message_id": "...", "question_number": 2 }],
    "reason": "silent_ratio > 0.8"
  }
  ```
- Stocké dans `reports.audio_health` (jsonb, nouvelle colonne).
- Si `verdict === "failed"`, le rapport est généré quand même mais avec un flag.

### 3. Affichage rapport (le cœur de la demande)
Dans `src/pages/SessionDetail.tsx` et `src/pages/SharedReport.tsx` :

**Quand `audio_health.verdict === "failed"` :**
- **Bandeau rouge en haut** (au-dessus du `DecisionBanner`) :
  > 🔇 **Problème audio détecté** — 87 % de l'entretien est silencieux ou inaudible. Le micro du candidat était probablement coupé ou défectueux. Les notes ci-dessous ne sont pas fiables.
- **Remplacement de la note** : dans le `DecisionBanner` et tous les badges (`FitScoreBadge`, `BigFiveBadge`, `ParaverbalBadge`, `NonverbalBadge`), afficher un **picto `MicOff` rouge** à la place du score, avec tooltip « Audio défaillant — note non calculée ».
- Les onglets « Big Five / Orale / Attitude » affichent le même état vide qu'aujourd'hui (analyses non disponibles).
- L'onglet « Réponses » reste accessible : sur chaque `QuestionAnswerRow` dont le segment est silencieux, badge « 🔇 Inaudible » à côté du numéro de question.

**Quand `audio_health.verdict === "degraded"` (entre 30 % et 80 % silencieux) :**
- Bandeau orange plus discret (« Qualité audio partielle — certaines réponses sont inaudibles »), liste les questions concernées, mais on garde les notes affichées.

### 4. Backfill sessions passées
Edge function `recompute-audio-health` (admin uniquement) qui recalcule `audio_health` pour les rapports existants à partir des transcriptions (`session_messages.content`), sans avoir besoin du RMS. Permet de flagger la session `36192d01-…` rétroactivement.

## Détails techniques

**Migration :**
```sql
ALTER TABLE public.session_messages ADD COLUMN audio_quality jsonb;
ALTER TABLE public.reports ADD COLUMN audio_health jsonb;
```

**Fichiers touchés :**
- `src/lib/audioQualityWatcher.ts` (nouveau)
- `src/pages/InterviewStart.tsx` (intégration watcher)
- `supabase/functions/transcribe-session/index.ts` (calcul verdict par segment)
- `supabase/functions/generate-report/index.ts` (agrégation `audio_health`)
- `supabase/functions/recompute-audio-health/index.ts` (nouveau, backfill)
- `src/pages/SessionDetail.tsx` + `src/pages/SharedReport.tsx` (bandeau + remplacement notes)
- `src/components/session/DecisionBanner.tsx` (prop `audioFailed` → picto rouge)
- `src/components/session/FitScoreBadge.tsx`, `BigFiveBadge.tsx`, `ParaverbalBadge.tsx`, `NonverbalBadge.tsx` (état « MicOff rouge »)

**Hors scope :**
- Bandeau temps réel pendant l'entretien (déjà couvert par le système 6/12/20 s existant).
- Détection bruit/écho/larsen.
- Réajustement automatique des notes IA.
