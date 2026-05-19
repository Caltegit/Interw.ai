# Problème

Le lien candidat (`/session/:slug`) charge le projet via une requête sur la table `projects`. Les politiques de sécurité (RLS) actuelles autorisent :

- **Anonyme** : voir les projets dont `status = 'active'` → OK quand on n'est pas connecté.
- **Connecté** : voir uniquement les projets de sa propre organisation (ou super admin).

Conséquence : quand un utilisateur RH est connecté (ou en prise en main super admin, comme dans la capture où tu es connectée en tant que `marie@morning.fr`) et qu'il ouvre un lien candidat appartenant à **une autre organisation**, RLS renvoie 0 ligne → la page affiche « Ce lien est invalide ou le projet n'est plus actif ».

Vérifié en base : le projet `directeur-domaine-chapelle-02b41d` existe, est `active`, mais appartient à une organisation différente de celle de marie.

# Correction

Ajouter une politique RLS sur `public.projects` pour le rôle `authenticated` qui reflète celle des anonymes : tout projet `active` reste lisible. Cela rend le lien candidat universel (un RH ou un admin peut le tester depuis son propre compte sans devoir se déconnecter), sans élargir les droits d'écriture.

## Détails techniques

```sql
CREATE POLICY "Authenticated can view active projects"
ON public.projects
FOR SELECT
TO authenticated
USING (status = 'active');
```

Aucune autre table touchée, aucun changement applicatif nécessaire. Les politiques d'écriture (update/delete) restent inchangées : seul un membre de l'organisation peut modifier le projet.

# Vérification

Après migration, rouvrir le lien `interw.ai/session/directeur-domaine-chapelle-02b41d` en étant connecté : la page candidat doit s'afficher normalement.
