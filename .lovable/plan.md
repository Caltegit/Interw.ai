## Objectif

Le champ "Poste" saisi par le candidat doit apparaître à deux endroits dans le rapport :

1. **Sous la ligne meta** ("Candidature spontanée · 0 min · 2 réponses · il y a 7 min") dans le bandeau du rapport.
2. **Pré-rempli dans les notes recruteur** sous la forme `Poste : <texte saisi>`, écrit **une seule fois** à la création de la session. Si le recruteur édite ou supprime cette ligne, elle ne réapparaît jamais.

## Bug bloquant à corriger d'abord

Le hook `src/hooks/queries/useSessionDetail.ts` ne sélectionne pas `candidate_job_title`, `candidate_cover_letter_url` ni `candidate_cover_letter_filename`. Vérifié en base : ces colonnes sont bien remplies (session test `f9414b39…` contient le poste, le CV et la lettre), mais le SELECT renvoie `null`. Tant que ce n'est pas corrigé, ni le poste ni la lettre de motivation ne s'affichent dans le rapport.

→ Ajouter ces 3 colonnes au `select(...)` de `useSessionDetail.ts`.

## Modifications

### 1. `src/hooks/queries/useSessionDetail.ts`
Ajouter `candidate_job_title`, `candidate_cover_letter_url`, `candidate_cover_letter_filename` à la chaîne `select(...)` ligne 18.

### 2. `src/components/session/DecisionBanner.tsx`
Déplacer l'affichage du `candidateJobTitle` : actuellement entre le nom et l'email (lignes 297-299 et 323-325). Le déplacer **sous** la ligne meta (`<p className="text-xs text-muted-foreground">{meta}</p>`, lignes 303 et 329) dans les deux variantes (mobile lg:hidden et desktop lg:block).

Style : `text-xs font-medium text-foreground/80` (déjà utilisé).

### 3. `src/pages/InterviewLanding.tsx`
Dans `handleStart`, au moment de l'`insert` dans `sessions` (ligne ~163), ajouter :

```ts
recruiter_note: candidateFields.job_title.enabled && trimmedJobTitle
  ? `Poste : ${trimmedJobTitle}`
  : null,
```

→ Pré-remplissage **une seule fois** à la création. Comme `recruiter_note` n'est jamais réécrit par le système ensuite (seules les éditions manuelles via `useUpdateRecruiterNotes` le modifient), si le recruteur efface la ligne, elle ne revient pas.

## Vérification après implémentation

1. Créer un projet avec le champ "Poste" activé.
2. Passer un entretien candidat en saisissant un intitulé de poste.
3. Ouvrir le rapport :
   - Vérifier l'apparition de l'intitulé du poste **sous** la ligne "Candidature spontanée · …".
   - Vérifier que la zone "Notes recruteur" contient `Poste : <intitulé>`.
   - Effacer cette note, sauvegarder, rafraîchir → la note reste vide (pas de réécriture automatique).
4. Vérifier que la lettre de motivation s'affiche bien aussi (icône cliquable) grâce au correctif du SELECT.
