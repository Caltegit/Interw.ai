# LinkedIn et CV du candidat sur le rapport

## Objectif

Sur le rapport d'entretien, à droite du nom du candidat dans le `DecisionBanner`, afficher deux pictos (LinkedIn + CV). Grisés quand vides, en couleur (cliquables) quand renseignés. Ajouter une entrée dans le menu Actions qui ouvre une pop-up permettant de saisir/modifier l'URL LinkedIn et de drag-and-dropper le CV.

## Changements

### 1. Base de données (migration)

Sur la table `sessions` :
- Ajouter `candidate_linkedin_url text` (nullable)
- Ajouter `candidate_cv_url text` (nullable) — URL publique vers le fichier dans le storage
- Ajouter `candidate_cv_filename text` (nullable) — nom d'origine pour l'affichage

Storage :
- Créer un bucket privé `candidate-cvs`
- Policies : lecture/écriture autorisées aux membres de l'organisation propriétaire de la session (via jointure `sessions` → `projects` → `organization_id`). Les CV ne sont jamais publics. L'URL stockée est résolue côté client via `createSignedUrl` au moment d'ouvrir le lien.

### 2. Nouveau composant `CandidateLinksDialog.tsx`

- Champ texte pour l'URL LinkedIn (validation simple : doit commencer par `http`)
- Zone drag-and-drop pour le CV (PDF, DOC, DOCX — max 10 Mo)
- Affichage du CV courant s'il existe, avec bouton « Remplacer » et « Supprimer »
- Boutons « Annuler » / « Enregistrer »
- À l'enregistrement : upload du fichier dans `candidate-cvs/{session_id}/{filename}`, puis `UPDATE sessions` avec les nouvelles valeurs

### 3. `DecisionBanner.tsx`

- Nouvelles props : `linkedinUrl?: string | null`, `cvUrl?: string | null`, `cvFilename?: string | null`, `onEditLinks?: () => void`
- À droite du nom du candidat (lignes 222 et 233), ajouter deux pictos `Linkedin` et `FileText` (lucide-react) :
  - Si l'URL existe : couleur normale (`text-primary`), cliquable, ouvre dans un nouvel onglet (CV via signed URL)
  - Sinon : grisé (`text-muted-foreground/40`), non cliquable, tooltip « Non renseigné »
- Dans le menu Actions, nouvelle entrée « Ajouter LinkedIn / CV » qui appelle `onEditLinks`

### 4. `SessionDetail.tsx`

- État local `linksDialogOpen`
- Passer les nouvelles props au `DecisionBanner` depuis `session.candidate_linkedin_url` etc.
- Rendre `<CandidateLinksDialog>` contrôlé par cet état
- Après enregistrement : invalider la query session pour rafraîchir

## Hors scope

- Pas de parsing automatique du CV
- Pas d'analyse IA du contenu du CV
- Pas d'affichage du CV embarqué dans la page (juste un lien vers le fichier)
