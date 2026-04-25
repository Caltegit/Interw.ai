## Contexte

Le champ existe déjà côté formulaire de création/édition de projet :
- Label actuel : **"Message juste avant la session"** dans `ProjectForm.tsx` (ligne 476)
- État : `preSessionMessage` / colonne DB : `pre_session_message`
- Valeur par défaut : `"Soyez naturel·le et souriez, vous êtes filmé·e !"`

**Problème** : sur l'écran "Prêt à démarrer ?" de `InterviewStart.tsx` (ligne 2551), le texte `"Soyez naturel.le et souriez vous êtes filmé.e !"` est codé en dur et n'utilise pas la valeur saisie par le recruteur.

## Modifications

### 1. `src/components/project/ProjectForm.tsx`
- Renommer le label **"Message juste avant la session"** → **"Message de début"** (ligne 476)
- Le champ reste positionné juste au-dessus de "Message de fin" (déjà le cas)

### 2. `src/pages/InterviewStart.tsx`
- Récupérer `pre_session_message` depuis le projet déjà chargé dans la page (la requête projet existe déjà — il suffira d'ajouter ce champ au `select` si absent)
- Remplacer le texte codé en dur ligne 2551 par la valeur dynamique du projet
- Fallback sur la constante `DEFAULT_PRE_SESSION_MESSAGE` si la valeur est vide/null

### 3. Aucun changement DB nécessaire
La colonne `pre_session_message` existe déjà (migration `20260425084430`).

## Résultat
Le recruteur peut éditer dans le formulaire le champ **"Message de début"** (au-dessus de "Message de fin"), et ce texte remplace celui affiché sur l'écran "Prêt à démarrer ?" vu par le candidat juste avant le lancement de la session.