## Objectif

Ajouter une entrée **« Assigner à »** dans le menu déroulant `BulkActionsButton` (vue Tableau & Cartes du projet). Au survol, un sous-menu déroule la liste des membres de l'organisation (plus « Non assignée ») et applique le choix à toutes les sessions sélectionnées.

## Comportement

- Nouvelle ligne dans le `DropdownMenu` du composant `BulkActionsButton`, entre « Comparer » et le séparateur « Supprimer ».
- Icône `UserCog` (lucide), libellé « Assigner à ».
- Au survol : `DropdownMenuSub` ouvre un sous-menu :
  - Première option : « Non assignée » (envoie `null`).
  - Ensuite : un item par membre de l'orga (`full_name` sinon `email`).
- Au clic :
  - Lance `Promise.allSettled` d'updates Supabase `sessions.assigned_to` pour chaque id sélectionné.
  - Met à jour `sessions` localement (optimiste après réponse).
  - Toast : « N session(s) assignée(s) à X » ou « Échec sur N sessions » si échecs partiels.
  - Pas de fermeture/effacement de la sélection (cohérent avec les autres actions groupées).

## Détails techniques

### `src/pages/ProjectDetail.tsx`

1. **Étendre les props** de `BulkActionsButton` :
   ```ts
   members: { user_id: string; full_name: string; email: string }[];
   onAssign: (assignee: string | null) => void;
   ```
2. **Ajouter l'item dans le menu**, en utilisant `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent` (déjà disponibles dans shadcn — sinon importer depuis `@/components/ui/dropdown-menu`).
3. **Ajouter dans le composant parent** une fonction `bulkAssign(assignee: string | null)` :
   ```ts
   const bulkAssign = async (assignee: string | null) => {
     const ids = [...selectedIds];
     if (ids.length === 0) return;
     const { error } = await supabase
       .from("sessions")
       .update({ assigned_to: assignee })
       .in("id", ids);
     if (error) {
       toast({ title: "Erreur", description: error.message, variant: "destructive" });
       return;
     }
     setSessions((prev) => prev.map((s) => (ids.includes(s.id) ? { ...s, assigned_to: assignee } : s)));
     const label = assignee ? memberLabel(assignee) : "personne";
     toast({ title: `${ids.length} session(s) assignée(s) à ${label}` });
   };
   ```
4. **Passer les props** dans les deux usages existants de `<BulkActionsButton ...>` (lignes ~698 et ~1051) :
   ```tsx
   members={orgMembers}
   onAssign={bulkAssign}
   ```

### Vérifications RLS
La table `sessions` a déjà des policies UPDATE permettant aux membres de l'orga de modifier les sessions de leurs projets. Aucune migration n'est nécessaire.

## Hors scope
- Pas de modification de la vue Cartes (le bouton Actions est partagé, donc l'option apparaît automatiquement).
- Pas de filtre/réorganisation après assignation.
- Pas de notification email à la personne assignée.

## Vérification
- Sélectionner 2 sessions → ouvrir Actions → « Assigner à » → choisir un membre → toast confirme et la colonne « Assignée à » est mise à jour pour les 2 lignes.
- Choisir « Non assignée » → `assigned_to = null` → la cellule affiche « — ».
