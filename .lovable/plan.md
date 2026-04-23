

## Bug : doublement des questions à chaque modification de projet

### Cause exacte (confirmée en base)

Dans `src/pages/ProjectEdit.tsx`, la sauvegarde fait :

```ts
await supabase.from("questions").delete().eq("project_id", id);
// puis insert des nouvelles questions
```

Mais la table `session_messages` a une clé étrangère vers `questions.id` avec **`ON DELETE NO ACTION`**. Donc dès qu'**une seule** question du projet est référencée par un message d'une session passée, le `DELETE` global échoue. Le code **n'inspecte jamais l'erreur retournée par `.delete()`**, l'enchaîne avec l'`INSERT`, et toutes les questions sont dupliquées.

J'ai vérifié en base : sur 4 projets concernés, on retrouve exactement ce motif (anciennes questions intactes + un nouveau jeu identique inséré plusieurs heures/jours plus tard, parfois 2 ou 3 fois). Sur le projet "Chef de Produit", une seule question (`order_index = 0`) est encore liée à un `session_message` — il a suffi d'elle pour bloquer la suppression de tout le lot.

Le même bug existe dans `evaluation_criteria` au niveau code (mêmes ligne `delete().insert()` non vérifiées), même si la FK n'est pas la même.

### Correction à apporter

**1) `src/pages/ProjectEdit.tsx` — remplacer le « delete + insert » par un upsert / merge intelligent**

Au lieu de tout supprimer puis réinsérer, on va :

- Charger l'état actuel des questions du projet (id, order_index, contenu, etc.).
- Comparer avec l'état soumis par le formulaire :
  - **Mises à jour** : pour chaque question existante encore présente (matchée par `id` interne du formulaire), faire un `UPDATE` ciblé.
  - **Insertions** : pour les nouvelles questions sans id, faire un `INSERT`.
  - **Suppressions** : pour les questions retirées du formulaire, tenter un `DELETE` ciblé. Si le delete échoue parce que la question est référencée par des `session_messages`, on bascule en **soft-disable** : on garde la question en base, mais on lui retire son `order_index` du projet en la marquant "archivée" (cf. point 3).
- Vérifier le `error` retourné par chaque appel Supabase et **lever** une exception si un delete échoue, pour que le toast d'erreur s'affiche au lieu de continuer silencieusement.

Pour réaliser le matching côté formulaire, on stockera l'`id` Supabase d'une question existante dans l'objet `Question` (champ `id?: string` à ajouter dans `StepQuestions.tsx` et à propager via `ProjectEdit.tsx` au chargement). Les nouvelles questions ajoutées dans le formulaire restent sans `id`.

**2) `src/pages/ProjectEdit.tsx` — protection anti double-clic / double-submit**

- Ajouter un `useRef` `savingRef` qui bloque toute nouvelle exécution de `handleSave` tant que la précédente n'est pas terminée. Le bouton est déjà `disabled` via `saving`, mais ce filet de sécurité empêche les rebonds React stricts ou les remounts.

**3) Migration BDD — préparer le « soft-disable » des questions référencées**

Ajouter une colonne `archived_at TIMESTAMPTZ NULL` sur `questions`. Quand on tente de supprimer une question qui possède des `session_messages`, on l'archive plutôt :

- L'éditeur de projet ne charge que les questions où `archived_at IS NULL`.
- Les écrans de session/rapport, eux, peuvent toujours retrouver le contenu de la question pour l'historique.

C'est plus propre que de laisser des FK orphelines ou que de risquer un DELETE qui plante.

**4) `src/pages/ProjectEdit.tsx` — appliquer le même pattern aux critères**

Mêmes corrections sur `evaluation_criteria` : matching par `id`, update / insert / delete ciblés, vérification des erreurs. Pas de soft-disable nécessaire, car aucune autre table ne référence `evaluation_criteria.id`.

**5) Nettoyage des doublons existants**

Une migration de nettoyage pour les 4 projets impactés :

- Pour chaque `(project_id, order_index)`, garder la question la **plus récente** (celle qui correspond à l'état attendu par l'utilisateur), supprimer les autres **uniquement si elles ne sont référencées par aucun `session_message`**.
- Pour les anciennes questions encore liées à un message : les marquer `archived_at = now()` (après l'ajout de la colonne) pour qu'elles disparaissent de l'éditeur sans casser l'historique.

### Vérification après implémentation

1. Modifier le projet "Chef de Produit" : enregistrer plusieurs fois → la base ne doit jamais dépasser le nombre de questions affichées dans l'éditeur.
2. Modifier un projet qui a déjà des sessions terminées (questions référencées) : la sauvegarde réussit, les questions liées à des messages sont conservées en arrière-plan (archivées) et n'apparaissent plus dans l'éditeur.
3. Recharger la page après modif → on retrouve exactement ce qu'on a sauvegardé, pas de doublons.
4. Cliquer 3 fois rapidement sur "Enregistrer" → un seul appel passe.

### Hors champ

- Pas de refonte du `ProjectForm` partagé : on touche uniquement à la logique de persistance dans `ProjectEdit.tsx` et au type `Question` pour porter l'`id`.
- Pas de modification du parcours candidat ni de l'orchestration des questions en entretien.
- Pas de changement sur `ProjectNew.tsx` (création) qui n'a pas le problème (toujours un INSERT pur).

