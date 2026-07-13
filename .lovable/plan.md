
## Objectif

Uniformiser l'ordre des étapes du wizard projet côté création (`ProjectNew`) **et** côté édition (`ProjectEdit`) en :

**Avant :** Infos → Intro → Questions → Critères → Publier
**Après :** Infos → Critères → Questions → Intro → Publier

Aucun changement de logique métier ni de schéma DB — uniquement l'ordre d'affichage et les indices `step`. Les deux pages partagent le même composant `ProjectForm`, donc **une seule modification structurelle** suffit pour couvrir création et édition.

---

## Modifications

### 1. `src/components/project/ProjectForm.tsx` (fichier unique, mutualisé)

- **Ligne 64** — Réordonner le tableau `STEPS` :
  ```
  const STEPS = ["Infos", "Critères", "Questions", "Intro", "Publier"];
  ```
- **Bloc de rendu des étapes (lignes ~717 à ~1165)** — Renuméroter les conditions `step === N` :
  - `step === 0` → Infos (inchangé)
  - `step === 1` → **StepCriteria** (avant : StepIntro)
  - `step === 2` → **StepQuestions** (inchangé en position mais renommer la garde)
  - `step === 3` → **StepIntro** (avant : StepCriteria)
  - `step === 4` → Publier (inchangé)
- **`canProceed()` (lignes 451-458)** — Adapter les indices :
  - `step === 0` → titre requis (inchangé)
  - `step === 1` → au moins 1 critère avec `label` (déplacé depuis step 3)
  - `step === 2` → au moins 1 question valide (inchangé)
  - `step === 3` → true (Intro, pas de validation bloquante — inchangé)

### 2. Aucun changement à `ProjectNew.tsx` ni `ProjectEdit.tsx`

Ces deux pages passent uniquement des props (`initial`, `onSubmit`, `mode`) à `ProjectForm`. La séquence de sauvegarde reste identique (avatar → INSERT projects → intro → questions → critères), indépendante de l'ordre d'affichage.

### 3. Tests E2E à mettre à jour

- **`tests/e2e/project-creation.spec.ts`** — Inverser Step 2 (Questions) et Step 3 (Critères) :
  - Après "Step 1 : poste + description", cliquer "Suivant" → arrive sur **Critères** : ouvrir la bibliothèque, cocher 2 critères, ajouter, Suivant.
  - Puis arrive sur **Questions** : ouvrir la bibliothèque, cocher 2 questions, ajouter, Suivant.
  - Puis Step 4 Intro (skip via "Suivant"), puis Step 5 Publier ("Créer").
  - Ajouter un `Suivant` supplémentaire car on passe désormais explicitement par l'étape Intro avant Publier (aujourd'hui le test enchaîne directement critères → créer à l'étape 4).

- **`tests/e2e/project-edit.spec.ts`** — Le test saute directement au step 5 via le stepper (`page.locator("button", { hasText: "5" })`). Le libellé "5" reste correct puisque le nombre total de steps ne change pas. **Aucune modification nécessaire.**

---

## Détails techniques

- **Impact backend :** aucun. Les colonnes `intro_*`, `evaluation_criteria`, `questions` sont écrites dans le même ordre côté `handleSubmit` de `ProjectNew.tsx` et `ProjectEdit.tsx`.
- **Impact sur les dépendances entre steps :**
  - `StepIntro` lit `ttsProvider` / `ttsVoiceId` / `aiPersonaName` définis à l'étape Infos → ✅ Infos reste avant Intro.
  - `StepCriteria` est totalement indépendant des autres étapes → ✅ déplaçable sans risque.
  - `StepQuestions` utilise le voice/persona pour `QuestionAvatarDialog` et les transitions IA → ✅ Infos reste avant Questions.
- **Stepper cliquable en édition (`isEdit`) :** l'utilisateur peut naviguer librement entre les 5 steps, ordre indifférent. Rien à ajuster.
- **Bibliothèques (`QuestionLibraryDialog`, `CriteriaLibraryDialog`) :** portées par leur step respectif, suivent automatiquement.

---

## Récapitulatif fichiers touchés

| Fichier | Type de changement |
|---|---|
| `src/components/project/ProjectForm.tsx` | Réordonner `STEPS`, renuméroter les gardes `step === N`, adapter `canProceed()` |
| `tests/e2e/project-creation.spec.ts` | Inverser l'ordre Questions/Critères + ajouter un clic "Suivant" pour l'étape Intro |
| `tests/e2e/project-edit.spec.ts` | Aucun changement |

Estimation : ~15 lignes modifiées dans `ProjectForm.tsx`, ~10 lignes dans le test E2E de création.
