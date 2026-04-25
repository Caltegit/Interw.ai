
## Plan : Analyse enrichie des sessions (6 modules psychométriques)

### 1. Migration de base de données
Ajouter 6 colonnes nullable à la table `reports` (rétro-compatible, anciens rapports non impactés) :
- `executive_summary_short` (text) — résumé 30 secondes
- `personality_profile` (jsonb) — scores Big Five + interprétations
- `soft_skills` (jsonb) — liste {skill, score, quote}
- `red_flags` (jsonb) — liste {type, severity, description, evidence}
- `motivation_scores` (jsonb) — {company_knowledge, role_fit, enthusiasm, long_term_intent}
- `followup_questions` (jsonb) — liste {question, rationale}

### 2. Edge function `generate-report`
- Basculer le modèle d'analyse psychométrique sur `google/gemini-2.5-pro`
- Enrichir le prompt système pour générer les 6 nouveaux modules
- Utiliser le tool calling pour extraction structurée fiable
- Persister les nouveaux champs dans `reports`
- Conserver la rétro-compatibilité (champs existants inchangés)

### 3. Template email `interview-report.tsx`
Ajouter trois sections après le résumé exécutif actuel :
- 🎯 Résumé en 30 secondes (encadré coloré)
- 🧠 Profil de personnalité (5 axes Big Five avec barres)
- ❓ Questions à creuser lors de l'entretien physique

### 4. Nouveaux composants UI (`src/components/session/`)
- `AiAnalysisDisclaimer.tsx` — bandeau RGPD/IA Act visible
- `ExecutiveSummaryCard.tsx` — encadré résumé 30s en haut
- `PersonalityRadar.tsx` — graphique radar Big Five
- `SoftSkillsCard.tsx` — soft skills avec citations exactes
- `RedFlagsCard.tsx` — signaux faibles avec sévérité
- `MotivationScoresCard.tsx` — barres de motivation
- `FollowupQuestionsCard.tsx` — questions actionnables

### 5. Intégration dans `SessionDetail.tsx`
Ordre d'affichage dans la section enrichie :
1. Disclaimer IA (en haut de la section)
2. Résumé exécutif 30s
3. Score global existant (inchangé)
4. Personnalité Big Five
5. Soft skills + citations
6. Motivation & Fit
7. Red flags
8. Questions à creuser
9. Reste du rapport existant (critères, questions, etc.)

### 6. Déploiement & vérification
- Déployer l'edge function `generate-report`
- Tester sur une session existante en regénérant un rapport
- Vérifier l'affichage UI et l'email recruteur
- Confirmer le rendu final avant publication

### ⚠️ Hors scope (phase 2)
- Sentiment timeline graphique
- Analyse linguistique avancée (STAR, je/nous)
- Marqueurs vocaux (pauses, hésitations)
- Profil de communication DISC
- Score d'authenticité
- Comparaison pool de candidats
