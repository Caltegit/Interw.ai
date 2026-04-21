

## Plan — Refonte du tableau Projets

### Modifications dans `src/pages/Projects.tsx`

**1. En-tête simplifié**
- Supprimer le titre "Projets" et le sous-titre "Gérez vos campagnes de recrutement"
- Déplacer le bouton **"Nouveau projet"** en haut à **gauche** (seul élément de l'en-tête)

**2. Nouvelles colonnes du tableau**

Ordre exact :

| Titre | Statut | Sessions | Créé le | Lien candidat | Modifier | Supprimer |
|---|---|---|---|---|---|---|

- **Sessions** : nouvelle colonne affichant le nombre total de sessions du projet (badge ou texte simple, ex: `12`)
- **Lien candidat** : bouton icône `Link2` dédié (copie le lien dans le presse-papier)
- **Modifier** : bouton icône `Pencil` dédié (navigue vers `/projects/:id/edit`)
- **Supprimer** : bouton icône `Trash2` dédié (ouvre la dialog de confirmation)
- Suppression du bouton "Voir" et du `DropdownMenu` mobile (actions toutes inline maintenant)
- La ligne reste cliquable pour naviguer vers le détail du projet (clic en dehors des boutons d'action)

**3. Récupération du nombre de sessions**

Modifier la requête actuelle :
```ts
supabase.from("projects").select("*, sessions(count)")
```
→ Postgres retourne `sessions: [{ count: N }]` qu'on lit via `project.sessions?.[0]?.count ?? 0`

**4. Responsive**
- Sur mobile (viewport actuel 863px = OK), garder toutes les colonnes visibles avec icônes seules
- Masquer les libellés texte des boutons d'action sur petits écrans (déjà géré via `sr-only sm:not-sr-only`)
- Colonne "Créé le" reste masquée sous `sm` (`hidden sm:table-cell`)

### Architecture visuelle

```text
[+ Nouveau projet]

┌──────────┬────────┬──────────┬──────────┬──────────────┬──────────┬───────────┐
│ Titre    │ Statut │ Sessions │ Créé le  │ Lien candidat│ Modifier │ Supprimer │
├──────────┼────────┼──────────┼──────────┼──────────────┼──────────┼───────────┤
│ Projet A │ Actif  │   12     │ 21/04/26 │   [🔗]       │   [✏]    │   [🗑]    │
└──────────┴────────┴──────────┴──────────┴──────────────┴──────────┴───────────┘
```

### Hors scope

- Pas de tri par colonne
- Pas de pagination
- Pas de filtres

