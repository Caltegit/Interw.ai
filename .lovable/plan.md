# Email récap hebdo

## Objectif
Chaque lundi à 10h (Europe/Paris), envoyer à chaque destinataire de rapports (`projects.report_recipient_user_ids`) un email par projet ayant eu de l'activité dans les 7 derniers jours.

## Contenu de l'email

**Objet** : `Récap interw sur le poste « {job_title} »`

**Corps** :
- Salutation `Bonjour {prénom},`
- **Section 1 — Nouveaux candidats (7 derniers jours)** : tableau HTML avec une ligne par session terminée depuis 7 jours :
  - Candidat (nom + email)
  - Date de l'entretien
  - Note IA globale (`reports.overall_score`)
  - Recommandation (`reports.recommendation` : à recommander / à considérer / à écarter)
  - Lien vers le rapport
- **Section 2 — Statistiques générales du projet** (cumul depuis création) :
  - Nombre total de sessions complétées
  - Nombre de nouvelles sessions cette semaine
  - Note IA moyenne (globale + cette semaine)
  - Répartition des recommandations (compteurs)
- Pas de section si aucun nouveau candidat sur la semaine → projet ignoré (pas d'email vide).

## Implémentation

### 1. Template React Email
Nouveau fichier `supabase/functions/_shared/transactional-email-templates/weekly-project-recap.tsx`, enregistré dans `registry.ts` sous la clé `weekly-project-recap`. Style aligné avec `interview-report.tsx` (mêmes couleurs/typo de la marque). Sujet dynamique via fonction `(data) => \`Récap interw sur le poste « ${data.jobTitle} »\``.

### 2. Edge Function `send-weekly-recaps`
Nouveau `supabase/functions/send-weekly-recaps/index.ts` (verify_jwt = true, déclenché par pg_cron) :
- Récupère tous les projets `status='active'` avec `report_recipient_user_ids` non vide.
- Pour chaque projet :
  - Charge les sessions `completed` des 7 derniers jours + leur `reports` (jointure).
  - Si zéro nouvelle session → skip.
  - Calcule les stats cumulées + hebdo.
  - Résout les destinataires : `profiles` join sur `report_recipient_user_ids` → email + prénom.
  - Pour chaque destinataire, invoque `send-transactional-email` avec `templateName: 'weekly-project-recap'`, `idempotencyKey: \`weekly-recap-${projectId}-${YYYY-WW}-${userId}\`` (idempotent même si le cron retente la même semaine).

### 3. Cron job (pg_cron)
Créer via `supabase--insert` (pas migration, contient l'anon key) :
```sql
select cron.schedule(
  'send-weekly-recaps',
  '0 9 * * 1', -- lundi 09:00 UTC = 10:00 Europe/Paris en hiver / 11:00 en été
  $$ select net.http_post(url:='…/functions/v1/send-weekly-recaps', headers:='…') $$
);
```
**Note timezone** : pg_cron tourne en UTC. `0 9 * * 1` = 10h Paris en hiver, 11h en été. Pour caler exactement 10h Paris toute l'année, la fonction vérifiera l'heure locale Paris au début et sortira si ≠ 10h ; cron sera planifié à `0 8 * * 1` ET `0 9 * * 1` pour couvrir les deux cas. (Alternative plus simple : on accepte le décalage été et on planifie `0 8 * * 1` = 10h Paris été / 9h Paris hiver — à confirmer ci-dessous.)

### 4. Suppression / unsubscribe
Géré automatiquement par `send-transactional-email` (suppression list + footer unsubscribe ajouté). Rien à faire de plus.

## Hors scope
- Pas de changement UI (les destinataires se configurent déjà à l'étape 5).
- Pas de page de réglage « activer/désactiver le récap » par projet (peut être ajouté plus tard).

## Question avant build
**Gestion du fuseau horaire** : tu préfères
- (a) **exactement 10h Paris toute l'année** (cron double + vérif côté fonction), ou
- (b) **10h Paris en hiver, 11h en été** (cron simple `0 9 * * 1`), ou
- (c) **9h Paris en hiver, 10h Paris en été** (cron simple `0 8 * * 1`) ?

Dis-moi (a/b/c) et je lance.
