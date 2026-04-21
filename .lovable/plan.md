

## Plan — Indication texte + Timer max par question

### Objectif

Permettre, pour chaque question, d'ajouter :
1. Une **indication texte** optionnelle (consigne, contexte, exemple)
2. Un **timer max de réponse** optionnel (minutes + secondes), par défaut 10 min lorsqu'activé

Ces éléments s'affichent côté candidat sans gêner le déroulé. Les questions existantes ne sont pas affectées.

---

### 1. Base de données

Migration sur les tables qui stockent les questions :

| Table | Colonnes ajoutées |
|---|---|
| `questions` | `hint_text text NULL`, `max_response_seconds int NULL` |
| `question_templates` | idem |
| `interview_template_questions` | idem |

- `NULL` = aucun (par défaut). Aucun backfill : toutes les questions existantes restent sans indication ni timer.
- Pas de contrainte CHECK (validation côté UI : `max_response_seconds` entre 30 et 3600 si défini).

### 2. Création / édition de question

**Fichier** : `src/components/QuestionFormDialog.tsx`

Ajout d'une nouvelle section **« Aide candidat »** (optionnelle, repliée par défaut via un `Collapsible` « + Ajouter une indication ou un temps limite ») :

- **Indication (texte court, max 300 car.)** — Textarea, placeholder : *« Ex : appuie-toi sur un exemple concret de ton dernier poste »*
- **Temps de réponse maximum** — Switch « Activer un temps limite »
  - Quand activé : 2 inputs numériques côte à côte → `min` (0-59) + `sec` (0-59), pré-remplis à **10 min / 0 s**
  - Quand désactivé : aucun timer côté candidat
- Texte d'aide : *« Si activé, un compte à rebours s'affiche ; le candidat passe à la suite à la fin du temps. »*

Mise à jour du type `QuestionFormValue` : `hintText: string`, `maxResponseSeconds: number | null`.

### 3. Propagation côté projet / templates

**Fichiers** :
- `src/components/project/StepQuestions.tsx` : étendre l'interface `Question` avec `hint_text` + `max_response_seconds`, propager dans `createEmptyQuestion`, `openEdit`, `handleFormSubmit`.
- `src/pages/ProjectNew.tsx`, `src/pages/ProjectEdit.tsx` : inclure les 2 nouveaux champs lors de l'`insert`/`update` dans `questions`.
- `src/pages/InterviewTemplateEdit.tsx` + import depuis bibliothèque : idem pour `interview_template_questions` et `question_templates`.
- `src/components/project/QuestionLibraryDialog.tsx` + `src/pages/QuestionLibrary.tsx` : preserver les 2 champs lors de l'import/export.

### 4. Affichage côté candidat

**Fichier** : `src/pages/InterviewStart.tsx`

**Emplacement de l'indication** :
Dans le bandeau de la question en cours (sous le titre/contenu de la question, au-dessus de la zone d'enregistrement). Style discret : encadré gris clair avec icône 💡 + texte. *Recommandation : c'est l'endroit où le regard du candidat se pose juste avant de répondre, donc l'indication est lue au bon moment, sans dupliquer la question elle-même.*

```
┌──────────────────────────────────────┐
│ Question 3/10                        │
│ Parlez-moi d'une situation difficile │
│                                      │
│ 💡 Appuie-toi sur un exemple concret │
│                                      │
│         🎤 [Vous écoutez]            │
│              02:34 / 10:00           │
└──────────────────────────────────────┘
```

**Emplacement du timer** :
Remplacer le compteur `responseElapsedSec` actuel (`02:34`) par un format `02:34 / 10:00` quand `max_response_seconds` est défini. Sinon, on conserve le compteur libre actuel (comportement inchangé pour les anciennes questions).

**Comportement** :
- Lorsque le compteur atteint `max_response_seconds`, déclenchement automatique de `handleEndAnswer()` (= comme si le candidat avait fini de parler) puis passage à la question suivante.
- Couleurs : vert > 50%, orange entre 25 % et 50 % restants, rouge < 25 %.
- Réinitialisation à chaque changement de question (déjà géré par l'effet existant sur `currentQuestionIndex`).

### 5. Aperçu RH

Dans `StepQuestions.tsx`, ajouter de petits indicateurs dans la ligne de chaque question quand ces options sont activées :
- Pastille `💡` si `hint_text` non vide
- Pastille `⏱ 10:00` si `max_response_seconds` défini

### Hors scope

- Pas de timer global d'entretien modifié (le `MAX_DURATION_MS` global de 10 min reste indépendant — il sera traité plus tard si besoin).
- Pas de notification email candidat sur les indications.
- Pas de modification des rapports/transcripts.

