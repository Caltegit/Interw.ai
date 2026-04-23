

## Le projet démo existe mais n'est pas visible par le nouvel admin

### Diagnostic

J'ai vérifié en base pour `c+5@bap.fr` (org `TEST 5`) :

- ✅ Profil créé, rattaché à l'organisation
- ✅ 50 question_templates, 10 criteria_templates, 6 interview_templates seedés
- ✅ **Le projet « Candidature spontanée - TEST - » existe bien** (id `383a5311…`, status `active`)
- ❌ **Mais `created_by` = `fb1046b7…` (toi, super-admin) au lieu de `5e9408af…` (le nouvel utilisateur invité)**

### Cause

Dans `accept_invitation`, quand un invité devient le **premier utilisateur** d'une org créée par un super-admin, on appelle :

```sql
PERFORM public.seed_demo_project(_org_id, _user_id);
```

→ `_user_id` est bien le nouvel utilisateur, donc en théorie OK.

**MAIS** le projet a été créé avec `created_by = fb1046b7…` (toi). C'est parce que la fonction `seed_demo_project` a en réalité été déclenchée **plus tôt**, par le trigger `trg_seed_org_question_templates` quand **tu as créé l'organisation via le superadmin** (avec `auth.uid()` = toi). Le seed du projet démo s'est donc fait avec ton id comme `created_by`.

Conséquence : la RLS `Users can view own projects` filtre sur `created_by = auth.uid()`, donc le nouvel utilisateur ne voit pas le projet (alors qu'il appartient à son organisation).

### Correctif

**1. Migration immédiate** (réparer les projets démo orphelins) :

```sql
-- Réassigne created_by au owner_id de l'org pour les projets démo
-- dont le créateur n'est pas membre de l'organisation
UPDATE public.projects p
SET created_by = o.owner_id
FROM public.organizations o
WHERE p.organization_id = o.id
  AND p.title = 'Candidature spontanée - TEST -'
  AND o.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.user_id = p.created_by
      AND pr.organization_id = p.organization_id
  );
```

**2. Élargir la visibilité projet aux membres de l'org** (vraie correction de fond) :

Aujourd'hui un projet n'est visible que par son créateur, pas par les autres admins de l'org. C'est restrictif et c'est exactement la cause du bug. Nouvelle policy SELECT :

```sql
CREATE POLICY "Org members can view org projects"
ON public.projects FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid()));
```

(On garde les policies UPDATE/DELETE/INSERT actuelles basées sur `created_by` pour ne pas changer la sécurité d'écriture.)

**3. Empêcher la récidive** dans `trg_seed_org_question_templates` :

Ne pas seeder le projet démo si `auth.uid()` n'est pas le futur owner — laisser ce seed à `accept_invitation` qui sait qui est le vrai utilisateur. Modification du trigger :

```sql
-- Dans trg_seed_org_question_templates : ne PAS appeler seed_demo_project
-- quand le créateur est un super_admin différent du owner_id (cas création
-- par superadmin via dialog). On laisse accept_invitation s'en charger.
IF NEW.owner_id IS NULL OR _creator = NEW.owner_id THEN
  PERFORM public.seed_demo_project(NEW.id, _creator);
END IF;
```

### Fichier touché

- Une nouvelle migration SQL avec les 3 blocs ci-dessus (UPDATE de réparation + nouvelle policy + correction du trigger).

### Hors champ

- Refonte complète des policies RLS sur les autres tables liées (questions, sessions, reports). On peut le faire dans un second temps si tu veux que les membres d'une org voient aussi les sessions/rapports des projets de leurs collègues.

