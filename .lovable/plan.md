# Mode démo : passage au thème clair

## Constat

Les écrans du mode démo utilisent le même habillage candidat que le parcours réel :

- `InterviewDemoLanding.tsx` et `InterviewDemoEnd.tsx` s'appuient sur `CandidateLayout` et sur les classes `candidate-*`. Aucune couleur sombre n'y est écrite en dur.
- Le déroulé de la démo passe par le même écran d'entretien que le parcours normal (`InterviewStart.tsx`, avec le drapeau `is_demo`). Il n'existe pas de feuille de style spécifique à la démo.

Conséquence : la bascule en blanc déjà réalisée s'applique automatiquement au mode démo. Les seuls fonds noirs restants dans la démo sont les cadres vidéo et le bandeau de légende par-dessus la vidéo, volontairement conservés pour la lisibilité de l'image.

## Ce qu'il reste à faire

1. Vérifier visuellement les trois écrans de démo (accueil démo, entretien démo, fin de démo) en desktop et en mobile.
2. Corriger uniquement les écarts constatés : contraste de texte trop faible, bordure ou survol resté sombre, badge peu lisible sur fond clair.
3. Ne rien changer à la logique de la démo ni aux zones vidéo.

## Détails techniques

- Fichiers concernés en cas de correctif : `src/pages/InterviewDemoLanding.tsx`, `src/pages/InterviewDemoEnd.tsx`, et si nécessaire les surcharges `.candidate-layout` dans `src/index.css`.
- Vérification par captures d'écran sur les routes de démo, puis contrôle des types.
