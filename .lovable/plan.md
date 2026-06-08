# Diagnostic : email candidat non envoyé après l'entretien

## Ce que dit la base

- Session `fa739e5d…` : `status = completed`, terminée le **8 juin 20:40 UTC**, `last_candidate_email_key = NULL`.
- Aucun envoi `candidate-thank-you` après le 8 juin dans `email_send_log`.
- Le candidat `clement.alteresco@gmail.com` a déjà reçu/eu en file un `candidate-thank-you` le **6 juin** (plusieurs lignes `pending` et `suppressed` avec `purged_after_duplicate_storm`).

## Cause

Dans `supabase/functions/process-report-queue/index.ts` (lignes 56–67), il y a une garde d'idempotence stricte ajoutée pour corriger un ancien bug de spam :

```ts
// Si un thank-you a déjà été envoyé à ce candidat sur les 30 derniers jours, skip.
const { data: alreadySent } = await supabase
  .from("email_send_log")
  .select("id")
  .eq("template_name", "candidate-thank-you")
  .eq("recipient_email", session.candidate_email)
  .in("status", ["pending", "sent"])
  .gte("created_at", thirtyDaysAgo)
  .limit(1);
if (alreadySent && alreadySent.length > 0) return;
```

Ce filtre est **par email candidat sur 30 jours**, sans tenir compte du `session_id`. Conséquences pour ton cas :
- Le candidat a reçu un thank-you le 6 juin (pour une autre session).
- Quand la session du 8 juin se termine, la garde trouve cette ligne et **skip silencieusement** l'envoi.
- Pas d'erreur, pas de DLQ, pas de ligne `email_send_log` pour la session du 8 juin → c'est "normal" au sens du code actuel, mais pas du point de vue produit.

À noter : il reste aussi plusieurs lignes `pending` jamais envoyées du 6 juin (probablement orphelines suite au purge). Tant qu'elles ne sont pas dépassées des 30 jours, **aucun candidat n'ayant déjà passé un entretien dans le mois ne recevra de thank-you** pour un nouvel entretien.

## Options de correction (à choisir)

**Option A — recommandée : scoper l'idempotence à la session.**
Ajouter `session_id` dans `metadata` lors du send (ou utiliser `idempotencyKey = candidate-thanks-${sessionId}` déjà présent) et filtrer dessus :

```ts
.eq("template_name", "candidate-thank-you")
.contains("metadata", { session_id: sessionId })
```

Avantage : chaque session = un email maximum, mais un même candidat peut en recevoir un par session. Comportement attendu pour un repassage / multi-postes.

**Option B — garder le 30j mais ignorer les lignes `pending` orphelines.**
Restreindre à `status = 'sent'` uniquement. Un peu plus risqué : si la file est lente, deux sends peuvent partir en parallèle.

**Option C — purger les lignes `pending` du 6 juin et relancer manuellement.**
Quick fix ponctuel pour ta session du 8 juin, ne résout pas le problème de fond.

Je recommande **Option A** (1 fichier modifié : `process-report-queue/index.ts`, déploiement de la function), avec en plus un **renvoi manuel one-shot** du thank-you pour la session `fa739e5d…` une fois le code corrigé.

## Vérification après fix

1. Appel manuel `process-report-queue` pour `fa739e5d…` (ou attendre le prochain tick cron).
2. Vérifier qu'une nouvelle ligne `email_send_log` apparaît avec `status = pending` puis `sent`.
3. Confirmer la réception côté boîte mail.
