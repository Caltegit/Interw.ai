## Objectif

Quand on ouvre le copilote IA, les suggestions de questions (état vide) s'adaptent à la page courante. Une fois le copilote ouvert, la liste reste figée tant qu'on ne le rouvre pas (snapshot à l'ouverture).

## Contextes détectés et suggestions associées

Détection via `location.pathname` au moment où `open` passe à `true`.

1. **Liste des projets** (`/projects`, `/dashboard`)
   - "Quels projets ont le plus de candidats à départager ?"
   - "Sur quels projets manque-t-il des critères d'évaluation ?"
   - "Résume l'avancement de mes projets en cours."

2. **Détail projet** (`/projects/:id`) — liste des candidats
   - "Quels sont les 3 candidats les plus prometteurs ?"
   - "Compare les deux meilleurs profils."
   - "Quels candidats présentent des points de vigilance ?"

3. **Comparateur** (`/projects/:id/compare`)
   - "Quelles différences clés entre les candidats sélectionnés ?"
   - "Lequel recommander pour un second entretien et pourquoi ?"
   - "Quel profil correspond le mieux aux critères prioritaires ?"

4. **Statistiques projet** (`/projects/:id/stats`)
   - "Quels critères discriminent le plus les candidats ?"
   - "Identifie les tendances sur les soft skills."
   - "Quelle question génère les réponses les plus pauvres ?"

5. **Création / édition projet** (`/projects/new`, `/projects/:id/edit`)
   - "Propose-moi 5 questions pour ce poste."
   - "Suggère 3 critères d'évaluation manquants."
   - "Améliore la formulation de mes questions actuelles."
   - "Mes questions couvrent-elles bien tous les critères ?"
   - Force `mode = "design"` à l'ouverture.

6. **Page publique projet** (`/projects/:id/public-page`)
   - "Rédige une description attractive du poste."
   - "Propose un titre accrocheur pour cette annonce."
   - "Quels avantages mettre en avant ?"

7. **Détail session / rapport** (`/sessions/:id`) — déjà en place
   - Suggestions candidat conservées (forces/faiblesses, relances, etc.).

8. **Bibliothèque questions / critères / intros / sessions** (`/library/*`)
   - "Propose 5 nouvelles questions à ajouter à ma bibliothèque."
   - "Quels critères génériques manque-t-il dans mes ressources ?"
   - "Suggère des questions adaptées à un poste de [type]."

9. **Fallback** (autres pages : Settings, Feedback, etc.)
   - Suggestions génériques actuelles (analyse).

## Détails techniques

### `src/contexts/CopilotContext.tsx`
- Ajouter `openedContext: CopilotOpenContext | null` au state, où `CopilotOpenContext = { kind: "projects-list" | "project-detail" | "compare" | "stats" | "project-edit" | "public-page" | "session" | "library" | "generic"; projectId?: string; sessionId?: string }`.
- Capturer `location.pathname` dans un wrapper `openCopilot()` qui calcule `openedContext` une seule fois. Exposer ce wrapper à la place du `setOpen(true)` direct utilisé par le bouton flottant.
- Reset `openedContext = null` lors de la fermeture.
- Si `kind === "project-edit"`, forcer `mode = "design"` au moment de l'ouverture (pas à chaque render).

### `src/components/copilot/CopilotFloatingButton.tsx`
- Remplacer l'appel `toggle()` par `open ? setOpen(false) : openCopilot()` afin que le snapshot du contexte se fasse à l'ouverture uniquement.

### `src/components/copilot/CopilotChatWindow.tsx`
- Accepter une prop `openedContext` (passée par `CopilotPanelContent`).
- Remplacer le calcul actuel `suggestions = sessionId ? ... : mode === "design" ? ... : ...` par une fonction `suggestionsFor(openedContext, mode, candidateName)` qui retourne le tableau correspondant au tableau ci-dessus.
- Adapter le placeholder + le titre de l'état vide aux mêmes cas (1–2 phrases courtes par contexte, sans verbiage).

### `src/components/copilot/CopilotPanelContent.tsx`
- Lire `openedContext` depuis le contexte et le transmettre à `CopilotChatWindow`.
- Pas de changement de structure (project picker, threads, mode tabs restent identiques).

### Hors périmètre
- Pas de modification du backend (`copilot-chat`) : seul l'UX des suggestions change.
- Pas de modification du schéma DB.
- Pas de touche aux pages elles-mêmes.

## Vérification
- Ouvrir le copilote successivement depuis `/projects`, `/projects/:id`, `/projects/:id/compare`, `/projects/:id/edit`, `/sessions/:id` et confirmer que les suggestions affichées correspondent.
- Vérifier qu'en naviguant après ouverture, les suggestions ne changent pas tant qu'on ne ferme/rouvre pas le panneau.
