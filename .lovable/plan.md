

## Message de fin personnalisable par projet

Permettre au recruteur de personnaliser la phrase affichée sur l'écran final de l'entretien candidat (par défaut : "Les meilleures équipes ne se recrutent pas. Elles se reconnaissent.").

### 1. Base de données
- Ajouter une colonne `completion_message` (text, nullable) à la table `projects`
- Pas de valeur par défaut en DB → le fallback sera géré côté UI pour rester modifiable

### 2. Création/édition de projet
Fichiers : `src/pages/ProjectNew.tsx` et `src/pages/ProjectEdit.tsx`
- Ajouter à la **dernière étape** un champ `Textarea` "Message de fin (affiché au candidat à la fin de l'entretien)"
- Placeholder + valeur initiale = phrase par défaut
- Petit texte d'aide : "Ce message s'affichera sur l'écran de remerciement après l'entretien."
- Sauvegarde dans `projects.completion_message`

### 3. Affichage côté candidat
Fichier : `src/pages/InterviewComplete.tsx`
- Récupérer le projet via le `token` de session (jointure `sessions` → `projects`) pour lire `completion_message`
- Afficher `project.completion_message ?? "Les meilleures équipes ne se recrutent pas. Elles se reconnaissent."`
- Remplacer la ligne `&nbsp;` actuelle (qui est vide) par ce message, pour qu'il devienne le sous-titre principal sous "Entretien terminé, merci !"

### Fichiers touchés
- Migration SQL (ajout colonne)
- `src/pages/ProjectNew.tsx` — champ + state + insert
- `src/pages/ProjectEdit.tsx` — champ + state + update
- `src/pages/InterviewComplete.tsx` — fetch + affichage

### Note RLS
La table `sessions` est déjà accessible publiquement par token côté candidat ; on étend juste la requête pour joindre `projects(completion_message)` (lecture publique nécessaire — à vérifier dans les policies existantes lors de l'implémentation).

