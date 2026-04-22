

## Bouton « Utiliser » sur les modèles de session

Ajouter un bouton **« Utiliser »** sur chaque carte de la page `Bibliothèque > Modèles` (`/library/sessions`) qui lance la création d'un projet pré-rempli avec le contenu du modèle.

### Fonctionnement

1. **Sur la carte modèle** : nouveau bouton primaire « Utiliser » (icône `Sparkles` ou `Play`) à côté de « Modifier ». Clic → navigue vers `/projects/new?template=<id>`.

2. **Sur `/projects/new`** : si `?template=<id>` est présent dans l'URL :
   - Charger le modèle (mêmes requêtes que `InterviewTemplatePickerDialog.handleApply`) au montage.
   - Construire le `InterviewTemplatePayload` et appliquer au formulaire avant le premier rendu (titre, langue, durée, questions, critères).
   - Afficher un toast discret « Modèle appliqué : <nom> ».
   - En cas d'échec (modèle introuvable / autre org), toast d'erreur + formulaire vierge habituel.

### Refacto minimale

Pour éviter la duplication de la logique de chargement du modèle, extraire une petite fonction utilitaire :
- **Nouveau** : `src/components/project/loadInterviewTemplate.ts` → fonction `loadInterviewTemplate(id: string): Promise<InterviewTemplatePayload | null>` qui factorise les 3 requêtes Supabase (template + questions + criteria) actuellement inlinées dans `InterviewTemplatePickerDialog`.
- `InterviewTemplatePickerDialog` réutilise cette fonction.

### Pré-remplissage côté ProjectNew

`ProjectNew.tsx` :
- Lit `searchParams.get("template")`.
- Si présent : `useEffect` au montage → `loadInterviewTemplate(id)` → applique au state initial via la même mécanique que `ProjectForm.applyTemplate` (extraire la logique d'`applyTemplate` en une fonction pure `mergeTemplateIntoState(state, payload)` exportée depuis `ProjectForm.tsx` pour être réutilisable côté `ProjectNew`).
- Le `ProjectForm` reçoit alors un `initial` déjà rempli.

### Fichiers touchés

- **Créé** : `src/components/project/loadInterviewTemplate.ts`
- **Modifiés** :
  - `src/pages/InterviewTemplates.tsx` — bouton « Utiliser » sur chaque carte
  - `src/pages/ProjectNew.tsx` — lecture `?template=<id>` + pré-remplissage
  - `src/components/project/ProjectForm.tsx` — exporter `mergeTemplateIntoState`
  - `src/components/project/InterviewTemplatePickerDialog.tsx` — utiliser `loadInterviewTemplate`

### Hors champ

- Pas de changement BDD.
- Pas de modification du wizard ni des étapes.
- Pas de déduplication des projets créés depuis le même modèle.

