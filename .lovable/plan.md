# Plan : Rapport vidéo enrichi

Objectif : enrichir le rapport actuel avec 5 nouveaux blocs analytiques basés sur la vidéo, livrés en 3 vagues indépendantes et testables.

## Décisions validées
- **Best-of v1** : lecteur séquentiel dans le navigateur (pas d'export MP4 pour l'instant)
- **Détection de biais** : incluse en Vague 3 avec cadrage légal explicite
- **Régénération** : bouton manuel sur chaque session (pas d'auto-batch)

---

## Architecture cible

```text
Pipeline actuel :   VIDEO → transcribe → paraverbal → generate-report
Pipeline cible :    VIDEO ┬→ transcribe ────────┐
                          ├→ paraverbal ────────┤
                          ├→ nonverbal ─────────┼→ generate-report (consolidé)
                          ├→ build-timeline ────┤
                          └→ select-highlights ─┘
```

`finalize-session` orchestre déjà la séquence — on ajoute les nouvelles étapes en parallèle après la transcription.

---

## Vague 1 — Non-verbal (fondation)

**Livrable** : nouvel onglet « Attitude » avec contact visuel, posture, gestuelle, micro-tensions, et liens « Voir le moment ».

### Backend
1. **Migration** : ajout de colonnes JSONB sur `reports` :
   - `nonverbal_analysis`, `highlights`, `timeline`, `reliability`, `coherence`
2. **Edge function `analyze-nonverbal`** :
   - Pour chaque clip vidéo candidat, appel Gemini 2.5 Pro multimodal avec schéma Zod strict (Output API)
   - Sortie : `{ eye_contact, posture, gestures, micro_tensions: [{message_id, timestamp, description}] }`
   - Agrégation pondérée par durée
3. **Orchestration** : `finalize-session` lance `analyze-nonverbal` en parallèle de `analyze-paraverbal`, puis `generate-report` consolide.
4. **`generate-report`** : intègre `nonverbal_analysis` dans le prompt final pour enrichir le bilan.

### Frontend
5. Onglet **« Attitude »** dans `SessionDetail.tsx` et `SharedReport.tsx` (entre « À l'oral » et « Réponses »).
6. Composant `NonverbalProfileCard` (calqué sur `ParaverbalProfileCard`) : jauges, observations, liste de moments cliquables.
7. **Bouton « Régénérer le rapport »** sur `SessionDetail` (RH uniquement) qui réinvoque `finalize-session` avec un flag `force=true`.

---

## Vague 2 — Best-of vidéo + Timeline

### Best-of (lecteur navigateur)
1. **Edge function `select-highlights`** :
   - Croise transcription + paraverbal + nonverbal
   - Gemini 2.5 Pro choisit 4 moments (forces / personnalité / vigilance / clôture)
   - Sortie : `[{message_id, start_seconds, end_seconds, label, justification}]` → `reports.highlights`
2. **Composant `HighlightsReel`** : lit `reports.highlights`, joue les 4 segments en séquence avec overlays (label + justification), barre de progression et boutons précédent/suivant.

### Timeline énergie/sentiment
3. **Edge function `build-timeline`** :
   - Découpe la session en fenêtres de 30 s
   - Gemini 2.5 Flash score énergie (0-100) et sentiment (-1..+1) par fenêtre
   - Sortie : `[{t_start, t_end, energy, sentiment, message_id}]` → `reports.timeline`
4. **Composant `EngagementTimeline`** : courbe SVG (Recharts), survol = aperçu, clic = `goToMessage()`.

Les deux blocs s'affichent dans l'onglet « Reco IA », au-dessus du bilan global.

---

## Vague 3 — Cohérence + Fiabilité + Biais

### Cohérence verbal/non-verbal
1. **Edge function `analyze-coherence`** :
   - Croise transcription + paraverbal + nonverbal
   - Détecte incongruences (ex : discours assuré + voix tremblante)
   - Sortie : `[{moment, verbal, nonverbal, incongruence_level, message_id}]`

### Fiabilité + Biais
2. **Edge function `analyze-reliability`** :
   - Qualité technique (réseau, audio, vidéo) depuis métriques existantes
   - Détection de réponse pré-écrite (lecture détectée via paraverbal)
   - Jauges biais : genre, accent, apparence
3. **Cadrage légal RGPD** :
   - Mention obligatoire en tête de bloc : « Indicateurs informatifs et non décisionnels, fournis pour aider à objectiver le jugement humain. »
   - Toggle org-level `enable_bias_detection` (colonne sur `organizations`), désactivé par défaut, activable par un admin
   - Page d'aide dédiée expliquant la méthodologie

### Frontend
4. Composants `CoherenceTable` et `ReliabilityCard` ajoutés à l'onglet « Reco IA ».

---

## Détails techniques transverses

- **Modèles IA** : Gemini 2.5 Pro pour analyses vidéo multimodales, Gemini 2.5 Flash pour la timeline (volume), via Lovable AI Gateway (clé déjà disponible).
- **Coût estimé** : ~0,50 € par entretien de 30 min pour le stack complet.
- **Idempotence** : chaque edge function vérifie si sa colonne JSONB est déjà remplie avant de relancer (sauf flag `force=true` du bouton régénérer).
- **Performance** : les 3 analyses parallélisées → temps total ≈ max(des 3) au lieu de la somme.
- **Schéma strict** : Output API + Zod sur chaque function pour éviter les hallucinations de structure.
- **Tests** : pour chaque vague, curl direct sur la function + vérification du rapport régénéré + test du clic « Voir le moment » sur le frontend.

---

## Ordre d'implémentation

1. **Vague 1** (migration + nonverbal + onglet Attitude + bouton régénérer)
2. **Vague 2** (timeline d'abord, puis best-of v1)
3. **Vague 3** (cohérence + fiabilité + toggle biais)

Chaque vague est livrée et validée avant de passer à la suivante.

Je démarre la Vague 1 dès validation.
