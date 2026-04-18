

## Landing page interw.ai — méthode et options

### Constat
Aujourd'hui `/` est protégé (Dashboard RH après login). Il faut une vraie **landing publique** sur la racine pour les visiteurs non connectés, qui présente le produit, et redirige les utilisateurs connectés vers le Dashboard.

### Charte graphique — comment l'intégrer
Tu as **3 façons** de me donner ta charte, du plus simple au plus complet :

1. **Site de référence (recommandé pour démarrer)** — tu m'envoies 1-3 URLs qui t'inspirent (style, ton, structure). J'analyse couleurs, typo, rythme visuel, et je m'en inspire sans copier. ✅ Le plus rapide.
2. **Captures d'écran / moodboard** — tu uploads des images (Dribbble, Behance, sites concurrents). Je détecte les couleurs dominantes et l'ambiance.
3. **Charte formelle** — si tu as un PDF de brand guidelines (logo, palette HEX, fonts, ton de voix), je l'applique pixel-près.

→ **Pour interw.ai, le plus pragmatique** : envoie-moi **1 site exemple** + dis-moi si tu veux garder l'indigo actuel (`#6366F1`) ou pivoter vers une autre direction (ex: dark + accent vif type Linear, ou clair/éditorial type Notion, ou premium/sombre type Vercel).

### Ce que je vais construire

**Route `/` repensée**
- Si non connecté → nouvelle `Landing.tsx` (publique)
- Si connecté → redirect vers `/dashboard`

**Sections de la landing (structure standard SaaS, à ajuster selon ton inspiration)**
1. **Header** — logo Interw.ai, nav (Fonctionnalités, Tarifs, Connexion), CTA "Demander une démo"
2. **Hero** — titre fort + sous-titre + CTA principal + visuel (mockup d'un entretien IA en cours)
3. **Logos clients** (placeholder pour l'instant)
4. **Problème / Solution** — pourquoi les entretiens RH classiques sont lents/biaisés, comment l'IA aide
5. **Fonctionnalités clés** (3-4 cartes) : entretien vidéo IA, scoring automatique, rapports détaillés, bibliothèque de questions
6. **Comment ça marche** (3 étapes) : créer un projet → envoyer le lien → recevoir les rapports
7. **Témoignages** (placeholder)
8. **CTA final** + footer (mentions légales, contact, RGPD)

**Stack visuelle**
- Composants shadcn existants (Card, Button, Badge)
- Tailwind, design tokens du projet
- Animations légères (fade-in au scroll via `framer-motion` ou pur CSS)
- Responsive mobile-first

**Routing**
- `src/App.tsx` : nouvelle route `/` publique conditionnelle (redirect via AuthContext si connecté)
- Ancien `Dashboard` reste sur `/dashboard`

**Hors scope V1**
- Page Tarifs, page À propos, blog → on ajoutera plus tard
- i18n (français only pour l'instant)
- Animations 3D / Lottie complexes

### Questions avant que je code

1. **Site(s) d'inspiration** — colle-moi 1 à 3 URLs (Linear, Vercel, Lovable, Notion, ou n'importe quoi qui te plaît visuellement)
2. **Direction visuelle** :
   - A. Garder indigo actuel + clair/aéré (type Notion/Linear clair)
   - B. Dark mode + accent vif (type Linear sombre, Vercel)
   - C. Premium éditorial (typo serif + beaucoup de blanc, type Stripe/Pitch)
   - D. Autre — décrit avec mots
3. **Ton de voix** : pro/corporate, fun/punchy, ou expert/RH-friendly ?
4. **CTA principal** : "Demander une démo", "Essayer gratuitement", "Créer un compte" ?

Réponds aux 4 et j'attaque.

