# Plan de correction

## Objectif
Faire en sorte que chaque membre d’une organisation voie tous les projets et toutes les sessions de cette organisation, sans rouvrir l’accès entre organisations.

## Ce que je vais corriger

### 1. Unifier les droits d’accès sur la vraie notion de membre d’organisation
- Remplacer la dépendance trop forte à `profiles.organization_id` par l’appartenance réelle dans `organization_members` pour les lectures RH.
- Conserver l’organisation active uniquement comme contexte d’affichage et de création, pas comme condition unique de visibilité des données.
- Garder l’exception super admin intacte.

### 2. Corriger les règles backend pour projets et sessions
- Mettre à jour les politiques de lecture de `projects` et `sessions` pour autoriser tout membre de l’organisation concernée.
- Vérifier les tables liées qui dépendent du même périmètre de lecture côté RH : `questions`, `evaluation_criteria`, `reports`, `transcripts`, `session_messages` si nécessaire.
- Préserver les accès publics candidats et les liens partagés déjà en place.

### 3. Aligner l’interface sur l’organisation affichée
- Vérifier les écrans qui listent les données d’orga (`/projects`, détail projet, dashboard) pour qu’ils affichent bien le périmètre attendu.
- Garder le sélecteur d’organisation comme filtre d’interface sur l’orga active, tout en s’appuyant sur des droits backend corrects.
- Éviter qu’un utilisateur membre d’ALBO voie une page vide simplement parce que son `profiles.organization_id` ou son cache ne reflète pas le bon contexte.

### 4. Sécuriser les lectures côté frontend les plus sensibles
- Revoir les requêtes qui reposent encore implicitement sur `get_user_organization_id()` ou `profiles.organization_id` quand cela crée un angle mort.
- Corriger en priorité les écrans critiques constatés dans ton bug : liste “Sessions” (`/projects`) et détail projet.

### 5. Valider le correctif avant de conclure
- Tester avec un compte membre d’organisation non créateur de projet.
- Vérifier qu’ALBO remonte bien ses projets puis les sessions associées.
- Vérifier qu’un membre Morning ne voit que Morning.
- Vérifier qu’aucune erreur RLS ni page vide injustifiée n’apparaît.

## Résultat attendu
- Tous les membres d’une même organisation voient les mêmes projets.
- Tous les membres d’une même organisation voient les mêmes sessions.
- Les organisations restent strictement isolées entre elles.
- Pas besoin de revenir en arrière globalement.

## Détails techniques
```text
Aujourd’hui
membership réel = organization_members
mais beaucoup d’accès = get_user_organization_id() -> profiles.organization_id active

Cible
visibilité des données RH = membership organization_members
contexte d’interface / création = organisation active
```

### Fichiers probablement concernés
- `supabase/migrations/...` pour corriger proprement les politiques d’accès
- `src/hooks/queries/useProjectsList.ts`
- `src/hooks/queries/useDashboardData.ts`
- `src/pages/ProjectDetail.tsx`
- éventuellement les composants qui s’appuient encore sur l’organisation active au lieu de l’appartenance réelle

### Principe de sécurité
- Je ne réouvre aucune politique globale “authenticated = tout voir”.
- Je limite bien la visibilité au périmètre de l’organisation du projet/session.
- Je conserve la séparation stricte entre organisations.

## Ordre d’implémentation
1. Corriger les politiques backend.
2. Ajuster les requêtes frontend impactées.
3. Tester avec ALBO et Morning.
4. Vérifier qu’on n’a pas de régression sur le dashboard et le détail session.