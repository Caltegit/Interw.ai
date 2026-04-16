
## Suppression des champs "Intitulé" et "Description du poste"

### Modifications dans `src/pages/ProjectNew.tsx`

1. **État local** : retirer `jobTitle`, `setJobTitle`, `description`, `setDescription`
2. **Validation `canProceed`** (step 0) : ne valider que `title.trim()` (sans `jobTitle`)
3. **Insert DB** : envoyer `job_title: ""` et `description: ""` (colonnes non-nullables probablement, donc string vide)
4. **JSX step 0** : supprimer les deux blocs `<div>` correspondant aux champs Intitulé et Description (et leur compteur 0/500)
5. **Récapitulatif step 4** : retirer la ligne `<strong>Poste :</strong> {jobTitle}`

### Vérification BDD
Confirmer rapidement via `mem://features/database-schema` que `job_title` et `description` acceptent une string vide (sinon, envoyer `null` ou ne pas les inclure dans l'insert).

C'est une modification ciblée sur un seul fichier, pas de migration nécessaire.
