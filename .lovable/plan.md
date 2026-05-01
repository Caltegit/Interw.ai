## Diagnostic

La suppression d'une session est appelée à 2 endroits : `src/pages/Dashboard.tsx` et `src/pages/ProjectDetail.tsx`. Les deux exécutent la même cascade côté client : `report_shares` → `session_messages` → `reports` → `transcripts` → `sessions`.

### Bugs identifiés

**1. Les politiques RLS DELETE ne couvrent QUE le créateur du projet.**
Les 4 politiques DELETE actuelles (`sessions`, `session_messages`, `reports`, `transcripts`) utilisent uniquement la condition `projects.created_by = auth.uid()`. Elles n'incluent ni `is_super_admin(auth.uid())`, ni l'appartenance à l'organisation (`organization_id = get_user_organization_id(auth.uid())`).

Conséquences :
- Un super-admin **non impersonné** voit les sessions de toutes les orgs (politique SELECT le permet) mais **ne peut pas les supprimer** : le DELETE est silencieusement ignoré par RLS.
- Un utilisateur RH d'une org qui essaie de supprimer la session d'un projet créé par un **collègue de la même org** est aussi bloqué. Seul le créateur exact peut supprimer.
- Lors d'une **impersonation**, ça marche uniquement si le user impersonné est lui-même le `created_by` du projet de la session.

**2. Aucune remontée d'erreur côté UI.**
Les deux pages ignorent les erreurs Supabase et affichent toujours « Session supprimé ». Sur Dashboard, le hook React Query rafraîchit, donc la ligne réapparaît → l'utilisateur a l'impression que ça plante. Sur ProjectDetail, `setSessions(prev => prev.filter(...))` retire la ligne localement même si la BDD n'a rien fait — la session « réapparaît » au prochain rechargement.

**3. Suppressions partielles non transactionnelles.**
Les 5 deletes sont 5 requêtes séquentielles côté client. Si la 3e échoue (RLS, réseau), on garde des orphelins (`session_messages` supprimés, `sessions` toujours là).

## Plan de correction

### A. Élargir les politiques RLS DELETE (migration)

Étendre les 4 politiques DELETE pour couvrir : créateur du projet **OU** membre de la même org **OU** super-admin. Cohérent avec les politiques UPDATE/SELECT existantes sur `projects`.

```sql
-- sessions
DROP POLICY "Users can delete own project sessions" ON public.sessions;
CREATE POLICY "Org members can delete sessions" ON public.sessions
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = sessions.project_id AND (
      p.created_by = auth.uid()
      OR p.organization_id = get_user_organization_id(auth.uid())
      OR is_super_admin(auth.uid())
    )
  )
);
```

Même schéma pour `session_messages`, `reports`, `transcripts`.

### B. Centraliser la suppression dans une edge function (recommandé)

Créer `supabase/functions/delete-session/index.ts` qui :
- Vérifie le JWT du caller.
- Vérifie via la fonction RPC que le caller a le droit (créateur, membre org, ou super-admin).
- Exécute la cascade côté serveur avec le service role (atomique, fiable, indépendant de RLS).
- Retourne `{ success: true }` ou une erreur explicite.

Avantage : un seul endroit à maintenir, pas de désync entre Dashboard et ProjectDetail, et marche même si on oublie d'étendre une RLS plus tard sur une table jointe.

### C. Mettre à jour les 2 pages d'appel

Dans `Dashboard.tsx` et `ProjectDetail.tsx` : remplacer la cascade en 5 deletes par un seul `supabase.functions.invoke("delete-session", { body: { session_id } })`. Afficher un toast d'erreur explicite si échec, ne pas retirer la ligne localement avant la confirmation.

## Fichiers modifiés

- **Migration SQL** : étendre les 4 policies DELETE (`sessions`, `session_messages`, `reports`, `transcripts`) — filet de sécurité même si on garde la logique côté edge.
- `supabase/functions/delete-session/index.ts` (nouveau) — cascade serveur centralisée avec contrôle d'accès.
- `src/pages/Dashboard.tsx` — appel de la nouvelle fonction + gestion d'erreur visible.
- `src/pages/ProjectDetail.tsx` — idem.

## Résultat attendu

Suppression fonctionnelle dans tous les scénarios :
1. RH créateur du projet ✅
2. RH collègue de la même org ✅ (nouveau)
3. Super-admin sur son propre compte, n'importe quelle org ✅ (nouveau)
4. Super-admin impersonant n'importe quel user ✅
5. Erreurs (réseau, droit refusé) remontées dans un toast au lieu d'un faux succès silencieux ✅