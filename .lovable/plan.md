

## Option B — URLs path-based par organisation : `interw.ai/o/{slug}`

### Schéma DB
Ajouter à `organizations` :
- `slug` text unique — généré auto à partir du nom (ex: "Acme Inc" → `acme-inc`)
- Backfill des orgs existantes
- Policy RLS `anon` SELECT sur orgs actives via slug (pour la page publique)

### Génération du slug
- À la création d'org (super admin + invitation) : slugify(name) + suffixe numérique si collision
- Éditable dans Settings (admin uniquement) avec validation unicité

### Nouvelle page publique `/o/:slug`
Vitrine org accessible sans auth :
- Logo + nom de l'org (chargés depuis `organizations` via slug)
- Liste des projets actifs publics de l'org (titre, job_title, bouton "Postuler" → `/interview/{project.slug}`)
- Branding minimal cohérent avec la marque org

### Réécriture des liens candidat (optionnel mais recommandé)
Garder l'existant `/interview/:slug/...` qui marche déjà, **et** ajouter une variante préfixée `/o/:orgSlug/i/:projectSlug/...` qui résout vers les mêmes pages. Les anciens liens continuent de fonctionner.

### Settings → exposer l'URL publique
Dans `Settings.tsx`, section Organisation :
- Champ `slug` éditable (admin)
- Affichage de l'URL publique `https://interw.ai/o/{slug}` avec bouton copier
- Lien "Voir la page publique"

### Fichiers touchés
1. Migration SQL : colonne `slug` + index unique + backfill + policy anon
2. `src/pages/OrgPublic.tsx` — **nouveau** (page `/o/:slug`)
3. `src/App.tsx` — route publique `/o/:slug`
4. `src/pages/Settings.tsx` — édition slug + affichage URL publique
5. `src/components/superadmin/CreateOrgDialog.tsx` — génération slug à la création

### Hors scope (gardé pour Option C plus tard)
- Vrais sous-domaines `acme.interw.ai` (nécessite wildcard DNS + Cloudflare Worker, hors Lovable)
- Branding visuel custom par org (couleurs, fonts) — possible plus tard via colonnes additionnelles

### Question
La page publique `/o/{slug}` doit-elle :
1. Lister les projets actifs de l'org (job board public), OU
2. Être juste une page vitrine (logo + nom + bouton contact), OU
3. Rediriger vers le site externe de l'org si renseigné ?

