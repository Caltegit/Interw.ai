## Objectif

Garder le rapport actuel (tout déplié) mais **renforcer chaque analyse par des preuves citées et cliquables**, fiabiliser les modules IA existants, et ajouter une comparaison "candidat vs moyenne du projet" directement dans le rapport.

---

## 1. Preuves & citations cliquables (priorité n°1)

### Côté IA — `supabase/functions/generate-report/index.ts`
Étendre le schéma de l'outil `generate_report` pour que chaque analyse cite ses sources :

- **soft_skills** : ajouter `evidence_message_id` (id du `session_messages` cité) en plus du `quote` déjà présent.
- **personality_profile** : pour chaque trait Big Five, ajouter `evidences[]` (1 à 2 citations courtes + `message_id`).
- **red_flags** : ajouter `evidence_message_id` à côté de `evidence` (texte).
- **strengths** et **areas_for_improvement** : passer de `string[]` à `{ text, evidence_message_id? }[]` (rétro-compatible côté lecture).
- **motivation_scores** : ajouter `evidence` court par sous-score (company_knowledge, role_fit, enthusiasm, long_term_intent).
- **question_evaluations** : déjà associé à une question, on ajoute `key_quote` (citation marquante de la réponse).

Le prompt sera mis à jour pour exiger explicitement : *"chaque score doit citer une phrase exacte du candidat issue de la transcription, avec l'id du message correspondant fourni dans la liste ci-dessous"*. On injectera dans le prompt la liste des messages candidats avec leurs ids (déjà disponibles via `session_messages`).

### Côté UI — composants existants
Mettre à jour les cartes pour rendre les citations **cliquables** et naviguer vers le moment exact :

- `SoftSkillsCard.tsx`, `RedFlagsCard.tsx`, `MotivationScoresCard.tsx`, `PersonalityRadar.tsx` : afficher la citation et un bouton **"▶ Voir le moment"** qui :
  1. Bascule sur l'onglet **Transcription** et scrolle vers le message (via `setActiveMessageIndex` déjà câblé dans `SessionDetail.tsx`).
  2. Si le message a un `video_segment_url`, ouvre directement la vidéo correspondante.
- `SessionDetail.tsx` : exposer une fonction `goToMessage(messageId)` partagée à toutes les cartes via props, qui résout l'index dans `messages` et déclenche le changement d'onglet + scroll.

**Bénéfice** : chaque affirmation IA devient vérifiable en 1 clic — fini le "boîte noire".

---

## 2. Fiabilisation des modules existants (sans nouveau module)

### Côté IA
- Renforcer le **prompt système** : interdire toute affirmation sans citation, exiger un score `null` plutôt qu'inventé quand la transcription ne permet pas de conclure.
- Ajouter un **garde-fou de cohérence** : si `overall_score >= 75` mais que `red_flags` contient un item `severity: high`, l'IA doit le justifier dans `executive_summary`.
- Pour **personality_profile**, ajouter un champ `confidence` (low/medium/high) par trait, affiché en UI sous forme de petit indicateur. Trop souvent les Big Five sont inférés avec peu de matière — autant le dire.
- Pour **soft_skills**, imposer un minimum de **3 skills** et exiger une citation par skill (`quote` devient `required`).

### Côté UI
- `PersonalityRadar.tsx` : afficher le badge de confiance à côté du score, et masquer un trait dont `confidence === "low"` derrière un *"Voir trait avec faible confiance"* repliable.
- Toutes les cartes : afficher un état vide explicite *"Données insuffisantes dans la transcription"* plutôt que de masquer silencieusement la carte (comportement actuel).

---

## 3. Comparaison candidat vs moyenne du projet (dans le rapport)

### Nouveau hook — `src/hooks/queries/useProjectAverages.ts`
Récupère pour `project_id` : 
- moyenne `overall_score`
- moyennes `criteria_scores[*].score`
- moyennes Big Five
- moyennes `motivation_scores`
- nombre de sessions complétées avec rapport

Requête sur `reports` joint à `sessions` filtré par `project_id` et `status = 'completed'`.

### Nouveau composant — `src/components/session/ProjectComparisonCard.tsx`
Affiché dans l'onglet **Synthèse**, juste sous `OverviewHeader` :

- Bandeau compact : *"Score global : 82/100 — moyenne du projet : 68/100 (sur 12 candidats)"* avec flèche ↑/↓ colorée.
- Mini barres comparatives pour les **critères du projet** (barre candidat + ligne marqueur "moyenne").
- Mini comparaison Big Five : radar superposé candidat vs moyenne (réutilise la logique de `PersonalityRadar`).

Si moins de 3 candidats complétés sur le projet, on masque la carte (pas assez de signal).

---

## 4. Rapport email (`interview-report.tsx`)

Aligner l'email avec les enrichissements :
- Afficher les citations sous chaque soft skill et red flag.
- Ajouter une ligne *"Score global vs moyenne projet : 82 vs 68 (+14)"* sous le score global.
- Pas de lien interactif citation/vidéo dans l'email (limite HTML email) — on garde juste le bouton "Voir le rapport complet" déjà présent.

---

## Fichiers impactés

**Backend**
- `supabase/functions/generate-report/index.ts` — schéma outil + prompt enrichis
- `supabase/functions/_shared/transactional-email-templates/interview-report.tsx` — citations + comparaison

**Frontend — modifications**
- `src/pages/SessionDetail.tsx` — navigation `goToMessage`, intégration carte comparaison
- `src/components/session/SoftSkillsCard.tsx` — citations cliquables
- `src/components/session/RedFlagsCard.tsx` — citations cliquables
- `src/components/session/MotivationScoresCard.tsx` — preuves par sous-score
- `src/components/session/PersonalityRadar.tsx` — confiance + citations + comparaison
- `src/components/session/VirtualizedMessageList.tsx` — exposer scroll vers id (si pas déjà fait)

**Frontend — créations**
- `src/hooks/queries/useProjectAverages.ts`
- `src/components/session/ProjectComparisonCard.tsx`

---

## Hors scope (sciemment)
- Aucun nouveau module d'analyse IA (style de communication, cohérence, fit poste) — tu as choisi de fiabiliser l'existant.
- Pas de refonte en onglets internes — on garde le format déplié actuel.
- Page `ProjectCompare` non touchée ici (la comparaison vit dans le rapport).

---

## Résultat attendu
Pour chaque score / soft skill / red flag, le recruteur verra la **citation exacte du candidat** et pourra cliquer pour voir/écouter le moment. Le score global est immédiatement mis en perspective avec la moyenne du projet. Les modules IA deviennent plus honnêtes (confiance affichée, états vides explicites).