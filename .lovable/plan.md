

## Plan : Refonte design candidat — Phases 1 + 2

Application complète des 10 améliorations proposées pour aligner l'interface candidat sur la charte du site vitrine (dark premium, accents indigo→violet).

### 1. Fondation CSS (`src/index.css`)
- Étendre `.candidate-layout` avec les tokens `--l-bg`, `--l-bg-elev`, `--l-accent`, `--l-accent-2`, `--l-border` (au lieu du beige/marron actuel `#1a1a1a` / `#d4a574`).
- Ajouter classes utilitaires : `.candidate-bg-grid`, `.candidate-hero-glow`, `.candidate-card`, `.candidate-btn-primary` (gradient indigo→violet).
- Nouvelles keyframes : `halo-breathe` (2.5s pulse pour avatar speaking), `ring-pulse` (listening), `progress-shine`.
- Garder backward-compat : les anciennes classes (`.bg-primary`, `.text-primary`) basculent vers indigo.

### 2. Layout & Header (`src/components/CandidateLayout.tsx`)
- Header sticky `backdrop-blur-md` avec :
  - Gauche : logo Sparkles gradient + "Interw.ai"
  - Droite : badge `ShieldCheck` "Entretien sécurisé"
- Fond global avec grid + halo radial subtil.
- Footer minimal "Propulsé par Interw.ai" (opacity 50%).

### 3. Page interview (`src/pages/InterviewStart.tsx`)
- **Barre de progression** fine en haut (gradient indigo→violet) basée sur `currentQuestionIndex / total`.
- **Avatar IA** : halo radial respirant quand `isSpeaking`, anneau pulsant fin quand `isListening`, ring statique au repos.
- **Question** : panneau central élargi `rounded-2xl`, texte `text-xl md:text-2xl`, chip catégorie en gradient text au-dessus ("Question X/Y · Type").
- **CTA principaux** ("Je suis prêt", "Terminer") : classe `.candidate-btn-primary` gradient.
- **Boutons secondaires** (Pause, Mute, Skip) : style ghost, icône seule + tooltip.
- **Overlay pause** : backdrop-blur, carte centrale, gradient text "En pause", compteur mono, bouton reprendre gradient.
- Transitions `landing-fade-up` réutilisées entre questions.

### 4. Composants interview
- **`MicVolumeMeter.tsx`** : barres en gradient indigo→violet quand actif, halo diffus si volume élevé.
- **`QuestionMediaPlayer.tsx`** : fond `--l-bg-elev`, bordure `--l-border`, coins `rounded-2xl`, contrôles teintés indigo.

### 5. Écran de fin (`src/pages/InterviewComplete.tsx`)
- Checkmark gradient indigo (au lieu de vert) avec animation trace.
- Titre en `landing-gradient-text`.
- Message custom conservé.

### Fichiers modifiés
- `src/index.css`
- `src/components/CandidateLayout.tsx`
- `src/pages/InterviewStart.tsx`
- `src/pages/InterviewComplete.tsx`
- `src/components/interview/MicVolumeMeter.tsx`
- `src/components/interview/QuestionMediaPlayer.tsx`

### Test final
1. Lancer un entretien → vérifier header sticky, fond grid+halo, barre progression visible.
2. Pendant question : avatar avec halo respirant, panneau central premium, chip catégorie.
3. Pendant réponse : anneau listening sur avatar, vu-mètre gradient.
4. Cliquer Pause → overlay blur cohérent.
5. Terminer → écran fin avec gradient indigo (plus de beige).
6. Vérifier responsive mobile (viewport 375px).

