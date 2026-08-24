# Onglet actif de /admin/system : diagnostic et ajustements

## Ce que j'ai vérifié

J'ai lancé la page dans un navigateur réel, connectée en super admin, et relevé l'URL à chaque étape :

| Étape | URL réelle observée |
|---|---|
| Ouverture de `/admin/system` | `/admin/system` |
| Clic sur « File des sessions » | `/admin/system?tab=sessions` |
| Ouverture de `/admin/sessions-queue` | `/admin/system?tab=sessions` |

Le paramètre est donc bien écrit dans l'URL et la redirection conserve bien la destination. Une recherche sur tout le code de la page et des deux onglets ne trouve aucun `localStorage`, `sessionStorage` ni état persistant : l'onglet vit uniquement dans `useSearchParams`, conformément à la spec. C'est aussi pour ça que le rechargement retombe sur le bon onglet — il relit l'URL, pas un stockage.

Ce que tu vois figé sur `/admin/system` est la barre d'adresse de l'aperçu Lovable, qui n'affiche que le chemin de la route et masque la partie `?tab=`. Le test demandé (coller `/admin/system?tab=sessions` dans une fenêtre privée) doit se faire sur l'URL publiée, pas dans la barre de l'aperçu.

## Deux ajustements quand même utiles

1. **Rendre le paramètre explicite dès l'arrivée** : à l'ouverture de `/admin/system` sans paramètre, écrire `?tab=emails` dans l'URL (en `replace`, donc sans entrée d'historique supplémentaire). L'URL n'est alors jamais ambiguë, et tout lien copié depuis la barre d'adresse porte l'onglet.
2. **Bouton Précédent** : le changement d'onglet utilise aujourd'hui `replace`, donc revenir en arrière saute la page entière. Passer en navigation normale pour que Précédent ramène à l'onglet précédent.

Aucune suppression de fichier n'est faite à cette étape : `src/pages/AdminEmails.tsx` et `src/pages/AdminSessionsQueue.tsx` restent en place tant que tu n'as pas validé.

## Test de validation

Sur l'URL publiée (pas l'aperçu), en navigation privée :

1. `/admin/system?tab=sessions` → arrivée directe sur la file des sessions.
2. `/admin/sessions-queue` → URL finale `/admin/system?tab=sessions`.
3. `/admin/emails` → URL finale `/admin/system?tab=emails`.
4. `/admin/system` sans paramètre → l'URL devient `/admin/system?tab=emails`.
5. Clic sur un onglet puis bouton Précédent → retour à l'onglet précédent.

## Détails techniques

Un seul fichier modifié : `src/pages/AdminSystem.tsx`.

- `useEffect` de normalisation : si `tab` est absent ou inconnu, `setSearchParams({ tab: "emails" }, { replace: true })`.
- `onChange` : `setSearchParams(next)` sans `replace`.
- Aucune autre modification, aucune dépendance, aucun changement de logique dans les onglets.
