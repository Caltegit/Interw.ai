## Objectif
Rendre le lien de lecture plus clair et plus fiable en affichant `Qn t.ss` à côté du picto play, tout en appliquant strictement une seule méthode de calcul du moment.

## Ce que je vais faire
1. **Verrouiller la méthode de calcul unique**
   - Conserver uniquement la règle proportionnelle dans le résolveur partagé :
     - durée de la réponse vidéo = 100 %
     - nombre total de mots transcrits = base de répartition
     - position du premier mot de la citation = pourcentage
     - temps = durée × pourcentage
   - Vérifier que cette même règle est utilisée à la génération du rapport et au recalcul des anciens rapports.

2. **Afficher `Q3 2.12s` dans l’interface**
   - Enrichir le composant `EvidenceLink` pour montrer, juste après le bouton play, un libellé compact du type `Q3 2.12s`.
   - Garder la citation tronquée à 20 caractères avec `…` comme demandé.

3. **Fournir à l’UI le numéro de question correspondant**
   - Faire remonter dans la page de détail un mapping `messageId -> numéro de question` à partir des messages et des questions du projet.
   - Passer cette info aux cartes qui affichent `EvidenceLink`, sans changer leur contenu métier.

4. **Valider le calcul et le format d’affichage**
   - Ajouter/adapter des tests sur le résolveur pour confirmer la formule proportionnelle.
   - Vérifier en aperçu que le libellé reste sur une ligne et que le clic play continue d’ouvrir le bon clip.

## Détails techniques
- **Fichiers visés**
  - `supabase/functions/_shared/resolve-start-seconds.ts`
  - `supabase/functions/_shared/resolve-start-seconds_test.ts`
  - `src/components/session/EvidenceLink.tsx`
  - `src/pages/SessionDetail.tsx`
  - cartes qui consomment `EvidenceLink` si besoin de props supplémentaires
- **Format UI**
  - `Q{numéro} {secondes}s`
  - secondes affichées avec 2 décimales
  - exemple : `Q3 2.12s`
- **Périmètre**
  - pas de changement de logique vidéo côté lecteur
  - pas de nouveau texte explicatif
  - pas d’autre méthode de calcul que celle que tu as décrite