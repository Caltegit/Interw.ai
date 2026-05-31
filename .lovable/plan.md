## Diagnostic

Le partage de rapport passe par l'edge function `consume-report-share`, qui :

1. Lit le `share_token` via la `service_role` (donc bypass RLS, indépendant du compte connecté).
2. **Dès le premier appel**, marque le lien `viewed_at = now()` et `is_active = false` (lien à « usage unique »).
3. Renvoie le rapport.

Le compte connecté n'est jamais vérifié, ni côté route (`/shared-report/:token` est public), ni côté edge function (`verify_jwt = false`, client `service_role`). **Le compte connecté n'est donc pas la vraie cause** — il l'a juste révélée.

Le vrai coupable est l'« usage unique » : le premier `GET` du lien consomme le partage. En pratique, ce premier `GET` est souvent fait par :

- les scanners de sécurité des messageries (Microsoft Defender SafeLinks, Gmail/Outlook URL scanning) **avant** que le destinataire ne clique ;
- les aperçus de lien (Slack, Teams, iMessage, Outlook reading pane) ;
- un double-clic accidentel, un refresh, un retour navigateur.

Résultat : quand le vrai destinataire ouvre le lien (connecté ou non, sur n'importe quel compte), il tombe sur « Ce lien a déjà été consulté ».

## Correctif

Remplacer l'« usage unique » par un « **usage lié au premier navigateur qui ouvre le lien** » :

1. Au premier appel à `consume-report-share`, générer un `viewer_secret` côté serveur, le stocker en base sur la ligne `report_shares`, et le renvoyer au client.
2. Le client stocke le `viewer_secret` dans `localStorage` (clé `share:<token>`) et le renvoie à chaque appel suivant.
3. Côté edge function :
   - Si le lien n'a jamais été consommé → on génère `viewer_secret`, on enregistre `viewed_at` + `viewer_secret`, on renvoie le rapport + le secret.
   - Si le lien a déjà été consommé et que le secret reçu correspond → on renvoie le rapport (autant de fois que voulu, tant que `expires_at` n'est pas dépassé).
   - Sinon → 410 « lien déjà consulté ».
4. Le `is_active = false` est conservé pour le verrouillage initial ; l'expiration à 48 h reste en place.

Côté UI du dialogue de partage, mettre à jour la mention :
- avant : « Lien à usage unique : il devient invalide dès la première ouverture. »
- après : « Lien à usage unique : il se verrouille sur le premier navigateur qui l'ouvre et expire après 48 h. »

## Fichiers touchés

```text
supabase/functions/consume-report-share/index.ts  # logique viewer_secret
supabase/migrations/<new>.sql                     # ajout colonne report_shares.viewer_secret (text, nullable)
src/pages/SharedReport.tsx                        # envoyer/persister viewer_secret en localStorage
src/components/session/ShareReportDialog.tsx      # libellé mis à jour
src/components/project/ShareReportsDialog.tsx     # libellé mis à jour (bloc d'avertissement)
```

## Détails techniques

- Migration : `ALTER TABLE public.report_shares ADD COLUMN viewer_secret text;` (la table est déjà accessible uniquement par `service_role`, pas de GRANT supplémentaire requis).
- `viewer_secret` : 32 octets aléatoires en hex (`crypto.getRandomValues`).
- `localStorage` key : `report-share:<token>` → résiste aux reloads et aux retours, scopé au navigateur.
- Pas de fuite côté autres comptes : un second navigateur (collègue, manager, etc.) qui ouvrirait le même lien reçoit 410, conformément à la promesse « un seul destinataire ».
- Pas de retry implicite : si tu veux pouvoir partager le même rapport avec plusieurs personnes, il faudra générer un nouveau lien par destinataire (ce qui est déjà le cas dans `ShareReportsDialog`).

## Alternative plus simple (à valider)

Si tu préfères supprimer complètement le verrou « 1 navigateur », on peut aussi :
- juste retirer `viewed_at` + `is_active = false` du premier appel ;
- ne garder que l'expiration à 48 h.

C'est moins strict côté confidentialité (n'importe qui avec le lien peut l'ouvrir pendant 48 h), mais c'est 5 lignes de code et zéro migration. À toi de me dire laquelle tu veux.
