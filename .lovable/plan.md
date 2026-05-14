## Objectif

Étendre le Copilote IA pour qu'il aide aussi à **concevoir** un projet (questions, critères, structure d'entretien) — pas seulement à analyser les candidats déjà passés.

Aujourd'hui, l'edge function `copilot-chat` n'injecte que les rapports d'évaluation. Le copilote ne sait donc rien des questions du projet, de la bibliothèque de questions/critères de l'organisation, et n'a aucun moyen d'agir sur le projet.

## Ce qu'on ajoute

### 1. Deux modes de copilote dans le drawer

Un petit sélecteur en haut du drawer (segmenté) :

- **Analyser les candidats** (mode actuel, inchangé)
- **Concevoir l'entretien** (nouveau)

Le mode est mémorisé par thread (nouvelle colonne `mode` sur `copilot_threads`), pour ne pas mélanger les contextes dans une même conversation.

### 2. Mode « Concevoir l'entretien »

Le copilote reçoit un contexte différent et propose des suggestions concrètes :

**Contexte injecté :**
- Projet : titre, intitulé du poste, langue, durée, description publique
- Questions actuelles du projet (titre, contenu, type, ordre, relances)
- Critères d'évaluation actuels (label, description, poids)
- Bibliothèque de l'organisation : questions modèles + critères modèles (échantillon, pour s'en inspirer)

**Suggestions de départ (chips) :**
- « Propose-moi 5 questions pour ce poste »
- « Mes questions couvrent-elles bien tous les critères ? »
- « Améliore la formulation de la question 2 »
- « Suggère 3 critères d'évaluation manquants »

**Format de réponse :** Markdown structuré. Quand l'IA propose des questions ou critères concrets, elle les renvoie aussi dans un bloc JSON balisé (` ```json ... ``` `) avec un schéma simple :

```json
{
  "type": "questions_suggestion",
  "items": [
    { "title": "...", "content": "...", "type": "open", "rationale": "..." }
  ]
}
```

### 3. Actions « 1-clic » dans le chat

Quand un message assistant contient un bloc JSON `questions_suggestion` ou `criteria_suggestion`, le `CopilotChatWindow` le détecte et affiche sous la bulle des cartes avec un bouton :

- **Ajouter cette question au projet** → insère dans `questions` (à la fin)
- **Ajouter ce critère au projet** → insère dans `evaluation_criteria` (avec rééquilibrage des poids existant)
- **Ajouter à la bibliothèque** → insère dans `question_templates` / `criteria_templates`

Toutes les actions passent par les hooks/queries existants côté front (pas de nouvelle edge function), avec invalidation React Query pour que le projet se mette à jour en direct.

V1 : pas de modification ni suppression automatique de questions/critères existants — seulement des ajouts, pour rester sûr.

### 4. Système prompt distinct

Deux fonctions `buildAnalysisSystemPrompt` (existante, renommée) et `buildDesignSystemPrompt` (nouvelle) dans `copilot-chat`. Le mode est lu sur le thread.

Le prompt « design » insiste sur :
- répondre en français concis
- proposer des questions ouvertes, comportementales, alignées sur le poste
- toujours expliquer brièvement le « pourquoi » (rationale)
- renvoyer le JSON balisé quand il propose des éléments concrets activables
- refuser les questions discriminatoires

## Détails techniques

**Migration DB**
- `ALTER TABLE copilot_threads ADD COLUMN mode text NOT NULL DEFAULT 'analysis' CHECK (mode IN ('analysis','design'));`

**Edge function `copilot-chat`**
- Lit `thread.mode`
- Si `analysis` → contexte rapports (actuel)
- Si `design` → contexte questions/critères projet + échantillon bibliothèque (organisation déduite via le projet)
- Construit le system prompt correspondant

**Front**
- `CopilotDrawer` : ajoute un `<Tabs>` ou `<ToggleGroup>` Mode au-dessus du `CopilotThreadSwitcher` ; le mode choisi est passé à `useCreateCopilotThread` (nouveau paramètre).
- `CopilotChatWindow` :
  - suggestions différentes selon le mode
  - parser markdown : extrait les blocs ```json ... ``` typés et rend des `<SuggestionActionCard>` sous le message assistant
  - les boutons appellent de nouveaux hooks `useAddQuestionToProject`, `useAddCriterionToProject`, `useAddQuestionToLibrary`, `useAddCriterionToLibrary` (tous via le client Supabase, RLS existant suffit).
- `useCopilot.ts` : ajoute `mode` au type `CopilotThread` et au paramètre de `useCreateCopilotThread`.

**Hors périmètre V1**
- Édition/suppression automatique de questions ou critères existants
- Réordonnancement automatique
- Génération de fichiers audio/vidéo pour les questions (TTS)
- Application en lot (« ajouter les 5 questions d'un coup ») — possible plus tard si l'usage le justifie

## Question ouverte

Quand l'IA propose une question, on insère par défaut **dans le projet courant** ou **dans la bibliothèque** ? Mon choix : 2 boutons côte à côte sur chaque carte (« Ajouter au projet » + « Enregistrer en bibliothèque »), pour laisser le recruteur décider au cas par cas. Ok pour toi ?
