## Plan : faire fonctionner l'email de remerciement candidat en fin de session

### Réponse à la question

**Oui, un email est prévu** : à la fin d'une session, un trigger Postgres `sessions_finalize_on_completed` appelle l'edge function `finalize-session`, qui invoque `send-transactional-email` avec le template **`candidate-thank-you`** (fichier `supabase/functions/_shared/transactional-email-templates/candidate-thank-you.tsx`).

Contenu actuel de l'email (FR) :
- Sujet : « Merci pour votre entretien »
- Salutation personnalisée (prénom du candidat)
- Confirmation que les réponses ont été enregistrées et seront analysées
- Bloc RGPD avec un bouton « Mes données personnelles » pointant vers la page de gestion de ses données
- Signature « L'équipe interw.ai »

### Problème détecté (l'email ne part pas)

Aucune ligne dans `email_send_log` pour `candidate-thank-you` (0/115 sessions terminées). Les logs de `finalize-session` montrent l'erreur réelle :

```
finalize-session: thank-you email failed (continuing)
Error: send-transactional-email 401: {"error":"Unauthorized"}
```

`send-transactional-email` refuse l'appel interne. Sa logique d'auth accepte un appel interne uniquement si :
- `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` correspond exactement à la valeur d'env, **ou**
- `x-internal-secret: <SUPABASE_SERVICE_ROLE_KEY>` correspond.

`finalize-session` envoie bien `Authorization: Bearer <SERVICE_ROLE_KEY>`, mais la comparaison stricte échoue (probable décalage lié au système de signing-keys de Supabase qui peut renvoyer une valeur différente selon le contexte). Le rapport, lui, est généré correctement parce que `generate-report` n'effectue pas ce contrôle strict.

### Correctif

**1. Edge function `finalize-session/index.ts`** — dans `invoke()`, ajouter le header `x-internal-secret` en plus du `Authorization` :

```ts
headers: {
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  apikey: SERVICE_ROLE_KEY,
  "x-internal-secret": SERVICE_ROLE_KEY,
  "Content-Type": "application/json",
},
```

Le `x-internal-secret` est lu en premier par `send-transactional-email` et passe le test interne même si la valeur du Bearer subit une transformation par le runtime.

**2. Faire de même dans les autres callers internes** qui invoquent `send-transactional-email` côté serveur (rapide vérification des fonctions : `report-interview-issue`, `check-email-failures`, `retry-email`, etc.) et appliquer le même header si nécessaire.

**3. Redéployer** `finalize-session` (et toute fonction modifiée).

### Vérification après correctif

1. Déclencher manuellement `finalize-session` avec `session_id` d'une session terminée récente sans email envoyé (par ex. `bd049121-5ee4-4e67-a096-f7d0aba177b6` — Oumaima Regragui).
2. Note : la garde d'idempotence retourne tôt si un report existe déjà → pour tester, je lancerai directement `send-transactional-email` avec `templateName: "candidate-thank-you"` et `recipientEmail` (ton email ou celui de ton choix) pour valider l'envoi de bout en bout.
3. Confirmer que `email_send_log` contient une ligne `candidate-thank-you` avec status `pending` puis `sent`.

### Hors scope

- Pas de migration DB (le trigger fonctionne déjà correctement).
- Pas de modification du template ni du contenu de l'email.
- Pas de changement de la logique d'auth de `send-transactional-email` (on s'aligne sur l'API existante via `x-internal-secret`).
