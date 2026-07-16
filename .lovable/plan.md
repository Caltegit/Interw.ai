# Audit des régressions du 8 juillet 2026

## Ce qui s'est passé le 8 juillet

Migrations de durcissement sécurité qui ont provoqué :

1. **`organizations`** : révocation du `SELECT` anon global, remplacé par un GRANT limité aux colonnes `id, name, slug, logo_url, created_at`.
2. **`report_shares` + `reports`** : suppression des policies anon (accès forcé via edge function).
3. **`storage.objects`** : suppression de `Anon can view media`, `Public can view media`, `Tutorials public read`, `Public can read feedback attachments`.

## Régressions déjà corrigées

- **9 juillet** — visibilité `organizations` pour utilisateurs authentifiés restaurée (super-admins + membres).
- **15 juillet 22h** — uploads candidats restaurés (`Anon can update interview media` + `Anon can view interview media` sur préfixe `interviews/`) → c'est la fameuse régression "Candidats à repasser".

## Résultat de mon audit du reste du code

Aucun autre build cassé détecté. Détail des vérifications :

- **Pages publiques anon lisant `organizations`** : `OrgPublic.tsx`, `ProjectPublicPage.tsx`, `CandidateLayout.tsx` — toutes limitent leur `select()` à des colonnes autorisées (id / name / slug / logo_url). Aucune colonne interdite lue.
- **`SharedReport.tsx`** : consomme déjà l'edge function `consume-report-share`, pas d'accès direct anon à `report_shares` / `reports`. OK.
- **Buckets `media`, `tutorials`, `feedback-attachments`** : tous en `public:true`. Les URLs servies via `getPublicUrl()` passent par le CDN et **ne dépendent pas** des policies SELECT droppées. Aucun `.list()` anon dans le client.
- **Uploads authentifiés (`ProjectEdit`, `ProjectNew`, `InterviewTemplateEdit`, `IntroLibrary`, `OrgLogoUpload`)** : couverts par `Org members can view media` + `Auth can update media` + `Org members can upload media`. Pas de risque de rejeu du bug upsert.
- **Autres tables sensibles** (`report_shares`, `reports`) : plus aucune requête client en anon.

Conclusion : les deux régressions identifiées sont les seules impacts du 8 juillet. Rien d'autre à réparer.

## Garde-fous à intégrer à chaque future demande

Pour chaque migration ou modif sécurité, j'ajouterai systématiquement une **checklist "impact sur les builds existants"** dans le plan, avant de coder :

### Grille d'analyse d'une migration/sécu

```text
1. GRANT/REVOKE sur table         → lister les fichiers client qui font .from("<table>")
                                    et vérifier les colonnes lues côté anon
2. DROP POLICY (SELECT)           → si bucket public → CDN OK, sinon parcourir
                                    les usages anon (.list, .download, .select)
3. DROP POLICY (INSERT/UPDATE)    → tout upload `upsert:true` en anon exige
                                    SELECT + INSERT + UPDATE : les trois
                                    policies doivent coexister
4. Nouvelle table publique        → GRANT (roles adaptés) + RLS + POLICY,
                                    dans le même fichier de migration
5. Edge function servant anon     → vérifier que la route publique passe
                                    bien par la fonction (pas de fallback
                                    direct client → table)
```

### Format que j'ajouterai à chaque réponse

Section "Impact build" en fin de plan, avec 3 champs courts :

- **Zones touchées** : quelles tables/policies/edges sont modifiées
- **Risque de casse** : `aucun` / `faible` / `à valider` + une phrase
- **Vérifications faites** : quels fichiers/routes j'ai relus avant de valider

Si `à valider`, je m'arrête et je demande avant de coder.

## Aucune action code proposée ici

Cet audit ne déclenche pas de fix : rien de cassé n'a été trouvé au-delà de ce qui a déjà été patché les 9 et 15 juillet. La suite = j'applique la grille ci-dessus à chaque prochaine demande.
