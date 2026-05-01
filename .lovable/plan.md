# Créer une session depuis un lien d'offre d'emploi

## Emplacement
Dans `ProjectForm.tsx` (étape 0, mode création), à **gauche** du bouton existant "Démarrer depuis un session type" :

> **"Démarrer depuis une offre existante"**

## Pop-up "Importer une offre"

| Champ | Défaut |
|---|---|
| Lien de l'offre (obligatoire) | vide |
| Intro | première intro de la bibliothèque de l'organisation, activée par défaut |
| Nombre de questions | **10** |
| Nombre de critères | **3** |
| Voix IA | **dernière voix utilisée** par le recruteur |

Bouton **"Générer la session"** avec loader (étapes : "Lecture de l'offre…" → "Génération des questions…").

Au succès, le formulaire en cours est pré-rempli (titre, intro, questions personnalisées, critères pondérés, voix). Le recruteur ajuste puis sauvegarde normalement.

## Logique technique

### 1. Connecteur Firecrawl
Activation du connecteur Firecrawl pour scraper la page de l'offre (gère JS et anti-bot, rend du markdown propre).

### 2. Edge function `import-job-offer`
- Input : `{ url, questionsCount, criteriaCount }`
- Auth : valide le JWT utilisateur
- Étape 1 : Firecrawl `/scrape` (markdown, onlyMainContent) via le gateway
- Étape 2 : Lovable AI (`google/gemini-2.5-flash`) avec **tool calling** pour produire un JSON strict :
  - `title` (poste + entreprise)
  - `questions[]` : exactement N questions ouvertes **personnalisées** (ancrées sur les missions, compétences et secteur de l'offre)
  - `criteria[]` : exactement M critères (`label`, `description`, `weight` somme = 100), calibrés sur les compétences clés
- Output : `{ title, questions, criteria }`
- Gestion d'erreurs 429 / 402 remontée au client

### 3. Dernière voix utilisée
Requête sur `projects` filtrée par `created_by = user.id`, triée `created_at desc limit 1`, lecture de `tts_provider`, `tts_voice_gender`, `tts_voice_id`. Fallback : voix par défaut actuelle.

### 4. Bibliothèque d'intros
Lecture de `intro_templates` filtrée par `organization_id`. Le sélecteur affiche les intros disponibles ; pré-sélection de la plus récente. L'intro choisie alimente `introEnabled = true` + `introMode` + `introText` / `introAudioPreviewUrl` / `introVideoPreviewUrl` selon son type.

### 5. Composant `ImportFromJobDialog`
`src/components/project/ImportFromJobDialog.tsx` :
- Dialog shadcn avec les 5 champs
- Validation URL (regex http/https)
- Appel à l'edge function via `supabase.functions.invoke`
- En succès : `onApply(payload)` qui pousse les valeurs dans le formulaire (pas de rechargement)

### 6. Intégration `ProjectForm.tsx`
- `const [importOpen, setImportOpen] = useState(false)`
- Bouton ajouté à gauche de l'existant
- Handler `applyJobImport(payload)` qui met à jour : `setTitle`, `setQuestions`, `setCriteria`, voix, intro

## Fichiers touchés
- Créé : `supabase/functions/import-job-offer/index.ts`
- Créé : `src/components/project/ImportFromJobDialog.tsx`
- Modifié : `src/components/project/ProjectForm.tsx`
- Activation : connecteur Firecrawl

## Hors périmètre (V2)
- Sauvegarde de l'URL source sur le projet
- Détection auto de la langue
- Extraction du logo entreprise
