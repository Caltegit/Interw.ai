
# Champs candidat configurables + refonte « Paramètres avancés »

## 1. Objectif

Permettre au recruteur d'activer/désactiver et de rendre obligatoires 4 champs supplémentaires sur le formulaire candidat (étape avant l'entretien) :
- **Poste** (texte)
- **CV** (upload fichier)
- **LinkedIn** (URL)
- **Lettre de motivation** (upload fichier)

Tous **off par défaut**, configurables depuis **Fonctionnalités avancées** de l'étape 1 de la création/édition d'entretien (chaque champ = un toggle d'activation + une case « obligatoire »).

Ajouter la **lettre de motivation** dans le rapport et dans la boîte « Ajouter les liens du candidat » (au même titre que LinkedIn/CV), avec un picto dédié.

Profiter de l'occasion pour **réorganiser** la section avancée qui devient longue et hétérogène.

---

## 2. Modèle de données

### 2.1 Table `projects` — nouveaux champs (toggles)

Un champ JSONB unique `candidate_fields` (plus simple à faire évoluer que 8 colonnes) :

```json
{
  "job_title":     { "enabled": false, "required": false },
  "cv":            { "enabled": false, "required": false },
  "linkedin":      { "enabled": false, "required": false },
  "cover_letter":  { "enabled": false, "required": false }
}
```

Default = tous off. Migration : ajouter la colonne avec ce default, backfill identique sur les projets existants.

### 2.2 Table `sessions` — nouvelles colonnes

Déjà présents : `candidate_linkedin_url`, `candidate_cv_url`, `candidate_cv_filename`.

À ajouter :
- `candidate_job_title text null`
- `candidate_cover_letter_url text null`
- `candidate_cover_letter_filename text null`

### 2.3 Storage

Réutiliser le bucket existant utilisé pour les CV. Nouveau préfixe `cover-letters/{session_id}/...` avec les mêmes policies que les CV.

---

## 3. UI — Création/édition projet (étape 1, « Avancé »)

### 3.1 Refonte de la section « Fonctionnalités avancées »

Aujourd'hui : un seul `Collapsible` contenant en vrac durée, pause, skip, timer, statut, messages, intro IA, transitions IA. Devient illisible.

Nouvelle organisation en **sous-sections avec titres** (toujours dans un seul collapsible global, mais structuré) :

```text
▾ Fonctionnalités avancées

  ┌─ Formulaire candidat ────────────────────────┐
  │  Champs collectés avant l'entretien.         │
  │  [ ] Poste            [ ] obligatoire        │
  │  [ ] CV               [ ] obligatoire        │
  │  [ ] LinkedIn         [ ] obligatoire        │
  │  [ ] Lettre de motiv. [ ] obligatoire        │
  └──────────────────────────────────────────────┘

  ┌─ Déroulé de l'entretien ─────────────────────┐
  │  Durée max (slider)                          │
  │  Autoriser pause                             │
  │  Autoriser passer une question               │
  │  Afficher le timer                           │
  └──────────────────────────────────────────────┘

  ┌─ Messages affichés au candidat ──────────────┐
  │  Message de début                            │
  │  Message de fin                              │
  └──────────────────────────────────────────────┘

  ┌─ Voix de l'IA ───────────────────────────────┐
  │  Intro IA (toggle + auto/custom)             │
  │  Transitions entre questions (idem)          │
  └──────────────────────────────────────────────┘

  ┌─ Diffusion ──────────────────────────────────┐
  │  Statut (Actif / Archivé)                    │
  └──────────────────────────────────────────────┘
```

Pas de nouveaux composants lourds : juste des en-têtes `<h4>` + séparateurs `<Separator />` à l'intérieur du `CollapsibleContent` existant. Aucun champ supprimé ni renommé, juste regroupé.

### 3.2 Sous-bloc « Formulaire candidat »

- 4 lignes identiques. Chaque ligne :
  - `Switch` activer le champ
  - Quand activé → `Checkbox` « Champ obligatoire » à droite (sinon masquée).
- État local `candidateFields` (objet typé), persistance dans `projects.candidate_fields` au save.
- Affichage dans le récap étape 4 : « Champs candidat : Poste*, CV ». (étoile = obligatoire)

---

## 4. UI — InterviewLanding (formulaire que voit le candidat)

`src/pages/InterviewLanding.tsx` : à partir de `project.candidate_fields`, afficher conditionnellement :
- **Poste** : `<Input>` texte simple.
- **LinkedIn** : `<Input type="url">` avec validation `https?://...linkedin...` souple.
- **CV** : `<input type="file" accept=".pdf,.doc,.docx">` (5 MB max), upload vers storage avant `start_interview`.
- **Lettre de motivation** : même UX que CV.

Validation au submit :
- `enabled && required` → bloque tant que vide/invalide.
- `enabled && !required` → optionnel.

Les valeurs sont stockées dans `sessions` (champs §2.2). Le flux d'upload réutilise le helper déjà utilisé pour les CV dans `CandidateLinksDialog`.

---

## 5. UI — Rapport et ajout manuel

### 5.1 `CandidateLinksDialog` (= « Ajouter à la main / éditer les liens »)

- Ajouter un champ **Lettre de motivation** identique au champ CV (upload + nom de fichier + remplacement).
- Ajouter un champ **Poste** (texte).
- Sauver dans les nouvelles colonnes `sessions.candidate_cover_letter_*` et `candidate_job_title`.

### 5.2 `SessionReportView`

- Passer `coverLetterUrl` / `coverLetterFilename` / `jobTitle` au sous-composant qui affiche déjà LinkedIn + CV.
- Afficher le **poste** sous le nom du candidat (s'il existe).
- À côté du picto LinkedIn et du picto CV, ajouter un **picto Lettre de motivation** (icône `Mail` ou `FileText` de lucide — à choisir pour ne pas dupliquer le picto CV ; proposition : `FileSignature`). Mêmes interactions (ouverture dans un nouvel onglet).

---

## 6. Détails techniques

- **Types** : nouveau type `CandidateFieldsConfig` dans `src/components/project/ProjectForm.tsx`, exposé via `ProjectFormState`. Lecture/écriture en JSONB → cast safe.
- **Default merge** : utilitaire `mergeCandidateFields(raw)` pour qu'un projet existant sans la colonne reste 100 % off.
- **`ProjectNew.tsx` / `ProjectEdit.tsx`** : ajouter `candidate_fields` au insert/update.
- **`InterviewLanding.tsx`** : étendre la requête projet pour ramener `candidate_fields`.
- **`start-interview` edge function** (si elle filtre les payloads) : whitelister les nouvelles clés `candidate_job_title`, `candidate_cv_url`, `candidate_cv_filename`, `candidate_linkedin_url`, `candidate_cover_letter_url`, `candidate_cover_letter_filename`. À vérifier au moment de l'implémentation.
- **Picto rapport** : import `FileSignature` (ou `FileText` si CV utilise déjà autre chose) depuis `lucide-react`. Tokens couleur = ceux déjà utilisés pour LinkedIn/CV.
- **Storage policy** : cover letters réutilisent les RLS du bucket existant — pas de migration policy nécessaire si on garde le même bucket et qu'on scope par session_id.

---

## 7. Plan d'implémentation

1. **Migration BDD** : `projects.candidate_fields jsonb default '{...off...}'` + 3 colonnes `sessions`.
2. **ProjectForm** : sous-bloc « Formulaire candidat » + refonte visuelle de l'avancé (sous-sections). Récap étape 4.
3. **ProjectNew / ProjectEdit** : persistance.
4. **InterviewLanding** : rendu conditionnel des 4 champs + validation + upload + envoi à `start-interview`.
5. **start-interview** (edge function) : accepter et stocker les nouvelles colonnes.
6. **CandidateLinksDialog** : champ Poste + champ Lettre de motivation.
7. **SessionReportView** : afficher poste + picto Lettre de motivation.
8. **Test manuel** : créer un projet avec les 4 champs requis → tester côté candidat (refus si vide) → vérifier que le rapport affiche tout, picto inclus.

Aucun champ existant n'est supprimé ; tout est rétrocompatible (les anciens projets gardent leurs paramètres, les 4 nouveaux switches sont off).
