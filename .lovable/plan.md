## Import depuis une URL — Page publique

Ajouter en haut de l'éditeur de page publique un encart « Importer depuis une URL ». L'utilisateur colle un lien (LinkedIn, Welcome to the Jungle, site carrière…), clique sur « Importer », et l'éditeur WYSIWYG est rempli avec une annonce reformatée par IA.

### 1. Connecteur Firecrawl

Activer le connecteur **Firecrawl** pour scraper proprement les sites complexes (rendu JS, anti-bot). La clé `FIRECRAWL_API_KEY` sera disponible dans les edge functions.

### 2. Edge function `import-public-page-from-url`

Nouvelle fonction `supabase/functions/import-public-page-from-url/index.ts`.

Entrée : `{ url: string }`
Sortie : `{ tiptap: object }` (document JSON Tiptap directement injectable dans l'éditeur)

Étapes côté serveur :
1. Validation de l'URL avec Zod (https obligatoire, longueur max).
2. Vérifie que l'utilisateur est authentifié (JWT).
3. Appel **Firecrawl v2 `/scrape`** avec `formats: ['markdown']`, `onlyMainContent: true`.
4. Tronque le markdown à ~15 000 caractères pour rester dans la fenêtre du modèle.
5. Appel **Lovable AI Gateway** (`google/gemini-3-flash-preview`) avec un prompt système qui :
   - reçoit le markdown brut,
   - rédige une annonce en français claire et structurée,
   - renvoie un **JSON Tiptap** directement (sections H2, paragraphes, listes à puces),
   - sections cibles : « À propos de l'entreprise », « Le poste », « Missions », « Profil recherché », « Ce que nous offrons ».
6. Renvoie le JSON Tiptap au client.

Gestion d'erreurs : 402 (crédits Firecrawl ou AI épuisés), 429 (rate-limit), 4xx upstream, et toujours retour CORS propre.

### 3. UI dans `ProjectPublicPageEditor.tsx`

Nouveau bloc en haut de la page, au-dessus du toggle d'activation :

```text
┌─ Importer depuis une URL ───────────────────────────┐
│ Collez le lien d'une annonce existante pour pré-    │
│ remplir le contenu de la page.                      │
│                                                     │
│ [ https://www.welcometothejungle.com/... ] [Importer]│
│                                                     │
│ ⚠ Le contenu actuel de l'éditeur sera remplacé.    │
└─────────────────────────────────────────────────────┘
```

Comportement :
- Bouton « Importer » désactivé si URL vide ou invalide.
- Pendant l'appel : spinner + bouton désactivé + toast « Lecture de la page… ».
- Au retour : remplace `page.content` par le JSON Tiptap reçu, l'éditeur Tiptap se met à jour automatiquement (déjà géré par la prop `value`).
- Toast de succès « Annonce importée » ou toast d'erreur avec message clair (URL inaccessible, site protégé, crédits épuisés).
- Pas de dialogue de confirmation — le bandeau d'avertissement sous le champ suffit (choix utilisateur : Remplacer).

### 4. RichTextEditor — synchronisation avec `value`

L'éditeur Tiptap actuel n'est initialisé qu'au montage et ne réagit pas aux changements de `value` venant du parent. Ajouter un `useEffect` qui appelle `editor.commands.setContent(value)` quand `value` change suite à un import, sans déclencher `onUpdate` (utiliser `false` en deuxième argument).

### Détails techniques

- **Validation URL** côté client (Zod ou simple `URL` constructor) avant appel.
- **Edge function** `verify_jwt = true` (par défaut) pour éviter les abus.
- **Rate-limit** simple en mémoire dans la fonction : 10 imports / heure / utilisateur (suffisant pour ce cas, à durcir plus tard si besoin).
- **Modèle IA** : `google/gemini-3-flash-preview` (rapide, peu coûteux, suffisant pour reformater une annonce). Réponse forcée en JSON via `response_format: json_object` + prompt système strict.
- **Sécurité** : la fonction ne stocke rien, ne renvoie que du JSON Tiptap. La sauvegarde reste manuelle côté éditeur (bouton « Enregistrer »).

### Hors périmètre

- Détection automatique du nom de poste / catégorie pour pré-remplir d'autres champs du projet.
- Import récurrent / synchronisation continue avec la source.
- Aperçu côte-à-côte avant remplacement.
