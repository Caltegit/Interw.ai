## Refonte de la carte « La voix de votre recruteur »

**Fichier :** `src/components/project/ProjectForm.tsx` (lignes ~732-814)

### Problèmes actuels
1. Un `{"\n"}` dans un `<p>` laisse un espace vide bizarre sous le titre.
2. Une fine ligne bleue (le `border-t` du `RadioGroup` mal placé visuellement) apparaît juste sous le titre.
3. Le titre « La voix de votre recruteur » est traité comme un simple `<Label>`, pas comme un titre de section.
4. La ligne « Voix sélectionnée : Léa » + boutons « Modifier la voix » / « Cloner ma voix » est tassée et la séparation visuelle est peu lisible.

### Modifications proposées

1. **En-tête de la carte** : remplacer le `<Label>` + `<p>` vide par un vrai titre `h4` (text-sm font-semibold) + un sous-titre discret « Choisissez le genre et la voix utilisés pendant l'entretien. » (utile et cohérent avec les autres sections avancées du formulaire).

2. **Supprimer le `{"\n"}`** et le `<p>` vide.

3. **Séparateur** : retirer le `border-t` qui crée la ligne sous le titre, et garder un seul `Separator` propre entre la zone radio (Femme/Homme) et la zone « Voix sélectionnée + actions ».

4. **Bloc bas (voix sélectionnée + actions)** :
   - Mettre « Voix sélectionnée : **Léa** » sur sa propre ligne avec un label discret.
   - Aligner les deux boutons « Modifier la voix » et « Cloner ma voix » à droite, avec un espacement régulier (`gap-2`), responsive (wrap sur mobile).

5. **Padding** : passer le padding de la carte de `p-4` à `p-5` et l'espacement vertical interne à `space-y-5` pour aérer.

### Hors scope
- Aucun changement de logique, d'état, ou de comportement des boutons / preview audio.
- Aucun changement aux autres sections du formulaire.
