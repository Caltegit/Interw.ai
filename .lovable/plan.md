

## Endroits où le nom "Interw.ai" devrait apparaître

J'ai cherché les occurrences visibles du nom du produit dans le code. Voici les endroits où "InterviewAI" est actuellement affiché et qu'il faudrait remplacer par **Interw.ai** :

### 1. Onglet navigateur & SEO (`index.html`)
- `<title>` : "InterviewAI — Entretien vidéo IA pour le recrutement"
- `<meta name="description">`
- `<meta property="og:title">` (partage réseaux sociaux)
- `<meta name="twitter:title">`

### 2. Sidebar RH (`src/components/AppSidebar.tsx`)
- Logo texte affiché en haut de la sidebar : `<span>InterviewAI</span>`

### 3. Memory projet (`mem://index.md`)
- Description du projet utilisée comme référence interne pour l'IA

### Pas concernés (à confirmer)
- Page de login, emails transactionnels, page candidat (`CandidateLayout`) → **aucune occurrence du nom** trouvée actuellement, donc rien à changer.
- README.md → contient juste le placeholder Lovable par défaut.

### Plan d'action proposé
Remplacer **InterviewAI** par **Interw.ai** dans :
1. `index.html` (title + 4 meta tags)
2. `src/components/AppSidebar.tsx` (logo sidebar)
3. `mem://index.md` (mémoire projet)

Et te rappeler de renommer aussi le projet côté Lovable (clic sur le nom en haut à gauche → "Rename project") — ça, je ne peux pas le faire pour toi.

Veux-tu aussi que j'ajoute le nom **Interw.ai** quelque part où il n'apparaît pas encore (ex. header de la page candidat, page de login, page de fin d'entretien) pour renforcer la marque ?

