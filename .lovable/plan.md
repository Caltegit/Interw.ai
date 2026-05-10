## Page publique d'annonce — par projet

Ajout d'une option « Page publique » dans le menu « ⋯ » d'un projet, ouvrant un éditeur dédié pour publier une vraie page web d'annonce du poste, partageable par lien, avec un éditeur riche (texte, images, vidéo) et un bouton vers l'entretien.

### 1. Base de données

Nouvelle table `project_public_pages` (1‑1 avec `projects`) :

- `project_id` (clé unique vers `projects`)
- `enabled` (bool, défaut `false`)
- `slug_public` (texte, unique — ex. `acme-dev-senior-2024`)
- `content` (jsonb — document de l'éditeur riche, format Tiptap)
- `cover_image_url` (texte, optionnel)
- `seo_title`, `seo_description` (texte, optionnels)
- `published_at`, `updated_at`

RLS :
- `SELECT` anonyme uniquement si `enabled = true`
- `SELECT/INSERT/UPDATE/DELETE` pour les membres de l'organisation du projet (même règle que `projects`)

Bucket de stockage : on réutilise le bucket `media` existant, sous le préfixe `public-pages/{project_id}/…`, avec lecture publique.

### 2. Routes

- **RH (protégée)** : `/projects/:id/public-page` → nouvelle page `ProjectPublicPageEditor.tsx`
- **Public (anonyme)** : `/p/:slugPublic` → nouvelle page `ProjectPublicPage.tsx`

Ajout dans `src/App.tsx` à côté des autres routes publiques `/o/:slug` et `/session/:slug`.

### 3. Entrée dans l'UI

Dans `src/pages/ProjectDetail.tsx`, dans le `DropdownMenu` (ligne ~573), ajouter en première position :

```
<DropdownMenuItem asChild>
  <Link to={`/projects/${project.id}/public-page`}>
    <Globe className="mr-2 h-4 w-4" /> Page publique
  </Link>
</DropdownMenuItem>
```

### 4. Page éditeur RH `ProjectPublicPageEditor`

Layout :

```text
┌─ En-tête ──────────────────────────────────────────┐
│ ← Retour au projet           [Aperçu]  [Enregistrer]│
│ Page publique — {titre du projet}                   │
├────────────────────────────────────────────────────┤
│ [Toggle ●━━]  Activer la page publique              │
│                                                    │
│ Lien public :  https://interw.ai/p/acme-dev   [📋] │
│ (visible uniquement si activé)                      │
├────────────────────────────────────────────────────┤
│ Image de couverture  [Téléverser]                   │
│ Titre SEO            [____________________]         │
│ Description SEO      [____________________]         │
├────────────────────────────────────────────────────┤
│ Contenu de la page                                  │
│ ┌──────────────────────────────────────────────┐   │
│ │ [B I U] [H1 H2] [• Liste] [Image] [Vidéo]    │   │
│ │                                              │   │
│ │   éditeur WYSIWYG (Tiptap)                   │   │
│ │                                              │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ Le bouton « Postuler » vers l'entretien est ajouté │
│ automatiquement en bas de la page publique.        │
└────────────────────────────────────────────────────┘
```

- Toggle d'activation : met à jour `enabled`.
- Slug public auto‑généré à partir du titre du projet (modifiable, vérification d'unicité).
- Lien copiable une fois activé.
- Sauvegarde manuelle (bouton « Enregistrer ») + indicateur « Modifié ».

### 5. Page publique `ProjectPublicPage`

- Charge `project_public_pages` par `slug_public` (anon, `enabled = true`), sinon 404.
- Affiche : image de couverture, titre du poste, contenu rendu depuis le JSON Tiptap, et bouton CTA fixe en bas « Passer l'entretien » → redirige vers `/session/{project.slug}` (page candidat existante).
- En-tête épuré avec le logo de l'organisation (déjà chargeable depuis `organizations.logo_url`).
- SEO : `<title>` et `<meta description>` dynamiques, OG tags, image OG = cover.

### Détails techniques

- **Éditeur WYSIWYG** : Tiptap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link`, extension vidéo custom pour iframes YouTube/Vimeo + upload direct vers le bucket `media`). Tiptap est léger, headless, parfait pour shadcn/Tailwind.
- **Stockage du contenu** : JSON Tiptap (`content` jsonb) → restitution avec `generateHTML` côté page publique pour SSR‑safe rendering.
- **Upload images/vidéos** : composant existant pas encore présent ; ajouter un petit helper `uploadPublicPageMedia(projectId, file)` qui pousse dans `media/public-pages/{projectId}/...` et retourne l'URL publique.
- **Slug public** : `slugify(project.title) + "-" + short(project.id)` avec recalcul si conflit. Utiliser `src/lib/slug.ts` existant.
- **Politique RLS anon** :
  ```sql
  create policy "Anon view active public pages"
  on public.project_public_pages for select to anon
  using (enabled = true);
  ```
- **Liens** : la page publique pointe vers `/session/{project.slug}` (déjà la landing candidat). Pas de duplication de logique d'entretien.

### Hors périmètre (à confirmer plus tard)

- Domaine personnalisé par organisation
- Formulaire de pré‑qualification sur la page publique
- Statistiques de vues / clics CTA
- Versioning du contenu / brouillons