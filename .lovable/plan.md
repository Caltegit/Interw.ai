
## Correction du bug persistant de prise en main

### Cause confirmée

Le bug n’est plus lié au `redirectTo` en premier lieu. Les logs montrent clairement :

```text
[impersonate] Unexpected error: userClient.auth.getClaims is not a function
```

Donc la fonction `superadmin-impersonate` casse avant même la génération du lien magique, ce qui provoque côté interface le message générique « non-2xx status code ».

### Ce qui va être corrigé

**Fichier modifié : `supabase/functions/superadmin-impersonate/index.ts`**

1. **Remplacer la vérification du user courant**
   - Supprimer l’appel à `userClient.auth.getClaims(token)` qui n’existe pas dans la version réellement utilisée par la fonction.
   - Utiliser une méthode compatible pour valider la session et récupérer l’utilisateur appelant :
     - soit `userClient.auth.getUser()`,
     - soit `userClient.auth.getUser(token)`.
   - Le `callerId` viendra de `user.id`.

2. **Aligner la version du client backend**
   - Passer l’import vers une version récente et cohérente avec les autres fonctions du projet.
   - Cela évite les écarts d’API entre fonctions super admin.

3. **Conserver le correctif déjà prévu sur le lien magique**
   - 1er essai avec `redirectTo`
   - repli sans `redirectTo` si besoin
   - logs détaillés sur chaque étape

4. **Durcir les réponses d’erreur**
   - Retourner un JSON clair pour :
     - absence d’authentification
     - utilisateur non super admin
     - utilisateur cible introuvable
     - échec de génération du lien
   - Garder les logs serveur lisibles pour diagnostiquer vite si un autre blocage apparaît.

**Fichier modifié : `src/lib/impersonation.ts`**

5. **Améliorer le message affiché côté interface**
   - Aujourd’hui, `supabase.functions.invoke()` remonte surtout une erreur générique si la fonction répond en 4xx/5xx.
   - Ajouter un traitement pour lire le message renvoyé par la fonction quand c’est possible, afin d’éviter le toast flou « non-2xx status code ».

### Résultat attendu

Quand un super admin clique sur « Prendre la main » :
- la fonction valide correctement l’utilisateur courant ;
- le lien magique est généré ;
- la redirection se fait vers le compte ciblé ;
- en cas de nouveau problème, le message affiché sera explicite au lieu du message générique actuel.

### Vérification

Après implémentation, test manuel du parcours :
1. ouvrir une organisation en super admin ;
2. cliquer sur « Prendre la main » sur un autre utilisateur ;
3. vérifier la connexion au compte cible ;
4. vérifier aussi le cas d’échec pour confirmer que le message affiché est lisible.

### Hors champ

- Pas de changement du mécanisme global d’impersonation.
- Pas de refonte de l’écran super admin.
- Pas de changement du bandeau de retour au compte d’origine.
