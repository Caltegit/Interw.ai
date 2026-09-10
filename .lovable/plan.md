# Corriger le scoring des candidats importés (Tango)

## Ce que j'ai vérifié

**1. Les candidats importés sont bien pénalisés.**
Joséphine Fresneau : la matrice lui donne 71 en expression orale et 74 en ton et attitude — des notes comparables à Angel Dominianni (67 / 71), qui affiche pourtant 72/100 contre 62/100 pour elle. L'écart ne vient pas de la matrice mais de la note d'ensemble, produite par un second passage de l'IA qui note chaque question du poste séparément. Dans son cas, la question « Qu'est-ce qui t'a donné envie d'accompagner des personnes âgées ? » reçoit 3/10 avec le commentaire « Question non traitée en détail par la candidate » — alors qu'elle n'a jamais eu cette question posée : elle a envoyé une seule vidéo libre. La consigne actuelle impose une note à chaque question, même absente, avec la grille « 1-3 : réponse absente ».

Effet secondaire visible : son rapport contient deux séries d'évaluations par question, l'une complète et l'autre entièrement vide, à cause d'un rattrapage qui recrée des entrées pour les questions manquantes.

**2. Aucune analyse orale : ce n'est pas un problème de piste audio.**
L'audio est bien présent (une piste par candidat importé). L'analyse orale exige au minimum **deux** extraits audio distincts pour se déclencher ; une vidéo unique n'en fournit qu'un seul, donc l'analyse s'arrête d'elle-même. Les neuf fiches importées portent toutes la mention interne « pas assez d'audio ». L'analyse orale est bien activée sur le poste Tango.

**3. Les écarts entre critères s'expliquent par deux calculs différents.**
La matrice ne lit que le texte : « Cadre et présentation » (critère visuel) n'est évalué pour aucun candidat importé. Le bloc de synthèse du rapport, lui, attribue quand même une note à ce critère en la déduisant des mots employés — d'où des notes qui apparaissent chez certains et pas chez d'autres, sans logique lisible.

## Ce que je propose de corriger

### A. Ne plus pénaliser une question jamais posée
- Dans la génération du rapport, repérer les entretiens importés (vidéo unique) et ne noter que les questions qui ont réellement un passage rattaché.
- Les questions sans passage sortent de la notation : elles ne reçoivent plus 1-3, elles ne comptent ni dans la note d'ensemble ni dans la moyenne. Elles s'affichent avec le tiret « non évalué » déjà utilisé dans la matrice.
- Supprimer le doublon d'évaluations vides pour ces entretiens.

### B. Débloquer l'analyse orale
- Abaisser à un seul extrait le minimum requis pour lancer l'analyse orale.
- Rattacher la piste audio de la vidéo aux passages découpés, pour que l'analyse dispose du même son que la transcription.

### C. Rendre les critères cohérents
- Le rapport ne note plus un critère que la matrice a laissé sans preuve : il reprend l'état « non évalué » au lieu d'inventer une note à partir du texte.
- « Cadre et présentation » reste donc non évalué pour ces imports, avec la mention explicite « nécessite l'analyse de l'image ». Si tu veux qu'il soit vraiment noté, il faut ajouter une analyse d'images extraites de la vidéo — je le propose en option, hors de ce lot.

### D. Recalculer les neuf fiches déjà importées
Relancer rapport + matrice sur les neuf candidats importés une fois les corrections en place, sans toucher aux vidéos ni aux transcriptions, et sans envoyer aucun e-mail.

## Détails techniques

- `supabase/functions/generate-report/index.ts` : détection `session.end_reason = 'imported_external'`, filtrage des questions sans message candidat rattaché avant construction du prompt, consigne « n'évalue que les questions listées », neutralisation du rattrapage qui recrée des entrées nulles, et alignement de `fit_breakdown` sur les critères réellement évalués.
- `supabase/functions/analyze-paraverbal/index.ts` : seuil `uploaded < 2` ramené à `uploaded < 1`.
- `supabase/functions/import-external-candidates/index.ts` : propagation de `audio_segment_url` sur les messages issus du découpage.
- Redéploiement des trois fonctions, puis relance ciblée des neuf sessions `end_reason = 'imported_external'`.
- Aucune modification de la logique de scoring des entretiens natifs : le comportement actuel reste inchangé quand toutes les questions ont été posées.
