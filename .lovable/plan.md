

## Retrait du texte « Analyse de la question » entre les questions

### Comportement souhaité

Pendant le temps de traitement IA entre deux questions, plus de texte explicatif. À la place, un petit indicateur visuel discret (3 points animés ou spinner) suffit à faire patienter le candidat.

### Changement

Dans `src/pages/InterviewStart.tsx`, localiser le bloc qui affiche « Analyse de la question… » (ou variante « L'IA réfléchit… », « Analyse en cours… ») dans la zone de transition entre questions, et :

- Supprimer le label texte.
- Conserver uniquement les 3 points animés (déjà présents dans le footer via `animate-bounce`) ou un spinner Loader2 discret, centré.

### Note

Le footer contient déjà un indicateur « L'IA réfléchit… » avec 3 points. Si le texte à retirer est ailleurs (overlay plein écran ou message inter-questions), je le repère par recherche (`Analyse`, `analyse de la question`) et j'enlève uniquement la chaîne texte tout en gardant l'animation.

### Fichier touché

- `src/pages/InterviewStart.tsx` — un seul bloc à éditer.

### Hors champ

- Aucun changement BDD.
- Pas de modification de la logique IA ni du timing.
- Le footer « L'IA réfléchit… » du bas reste si l'utilisateur le souhaite ; à confirmer si à retirer aussi.

