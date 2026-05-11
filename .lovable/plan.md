## Bug

La suppression groupée dans `ProjectDetail.tsx` ne se déclenche jamais : aucun appel à la fonction `delete-session` n'arrive côté serveur (vérifié via les logs).

## Cause

Les deux confirmations de suppression groupée utilisent la même variable d'état `bulkDeleteStep` (valeurs 0 → 1 → 2) avec deux `<AlertDialog>` distincts :

- Dialog A : `open={bulkDeleteStep === 1}`, `onOpenChange={(o) => !o && setBulkDeleteStep(0)}`
- Dialog B : `open={bulkDeleteStep === 2}`, `onOpenChange={(o) => !o && setBulkDeleteStep(0)}`

Quand l'utilisateur clique sur « Continuer » dans le dialog A, on appelle `setBulkDeleteStep(2)`. Conséquence en chaîne :

1. L'état passe à `2`.
2. Dialog A reçoit `open={false}` → Radix déclenche `onOpenChange(false)`.
3. Le handler `!o && setBulkDeleteStep(0)` **remet l'état à 0**.
4. Dialog B ne s'ouvre jamais, et la sélection redevient cliquable comme si rien ne s'était passé.

C'est un effet de bord typique quand deux dialogues partagent une seule machine d'états.

## Correctif

Dans `src/pages/ProjectDetail.tsx`, remplacer les `onOpenChange` des deux `AlertDialog` de suppression groupée par une version qui ne remet à 0 **que si l'étape courante correspond au dialogue qui se ferme** :

```ts
// Dialog A (étape 1)
onOpenChange={(o) => { if (!o) setBulkDeleteStep((s) => (s === 1 ? 0 : s)); }}

// Dialog B (étape 2)
onOpenChange={(o) => { if (!o) setBulkDeleteStep((s) => (s === 2 ? 0 : s)); }}
```

Bonus de robustesse : remplacer le `<Button variant="destructive">` du Dialog A par un `<AlertDialogAction>` (comportement standard Radix, ferme le dialogue proprement après le clic).

## Hors scope
- Pas de modification de la fonction edge `delete-session` (elle fonctionne, simplement jamais appelée).
- Pas de refonte du flow ; on garde la double confirmation existante.

## Vérification
- Ouvrir un projet, cocher 2 candidats, Actions → Supprimer → Continuer → Supprimer.
- La fonction `delete-session` doit apparaître dans les logs et les sessions doivent disparaître de la liste.
