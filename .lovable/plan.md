# Le connecteur répond, mais Claude ne l'appelle plus

## Diagnostic (vérifié à l'instant)

- Le connecteur en ligne est sain : fiche publique OK (« Interw »), appel sans identification rejeté proprement avec la bonne invitation d'authentification.
- Les journaux du connecteur ne montrent **aucun appel venant de Claude** à l'heure du test : seules mes propres vérifications apparaissent. Claude se déconnecte côté client, sans jamais interroger les outils — d'où « aucun outil disponible » alors que le serveur est opérationnel.
- La configuration d'autorisation est correcte (serveur OAuth actif, consentement sur `https://interw.com/.lovable/oauth/consent`, clés de signature asymétriques en place).
- Conclusion : au redéploiement, Claude a invalidé sa session du connecteur (jeton rafraîchi refusé ou manifeste re-vérifié pendant l'interruption) et a masqué les outils au lieu de proposer une reconnexion.

## Ce qu'il faut faire (côté Claude)

1. Ouvrir les réglages du connecteur Interw dans Claude (l'écran de la capture), cliquer **Disconnect**.
2. Reconnecter : nouvelle autorisation avec le compte Interw, approuver l'écran de consentement.
3. Dans une conversation neuve, demander la liste des postes, puis « les meilleurs candidats » sur un poste à plus de 100 candidats : la réponse doit contenir les scores et indiquer le total (« 100 sur 213 »).

## Côté application (seule modification proposée)

- Page **Réglages → Connexion IA** : ajouter une ligne d'aide — après une mise à jour du connecteur, si les outils disparaissent dans Claude ou ChatGPT, déconnecter puis reconnecter le connecteur. Rien d'autre ne change.

## Détails techniques

- `POST /functions/v1/mcp` sans jeton → 401 + `WWW-Authenticate: Bearer realm="mcp"` ; un jeton de session applicative (HS256, sans `client_id`) est rejeté `JOSEAlgNotAllowed` : le vérificateur fonctionne et refuse à juste titre les jetons non-OAuth.
- Journaux de la fonction `mcp` entre 13:03 et 13:08 : uniquement `auth.no_bearer_token` / `auth.token_rejected` issus de mes tests ; aucune trace des appels `initialize`/`tools/list` de Claude.
- `supabase--debug_oauth_server` : OAuth activé, DCR activé, URL de consentement cohérente, aucune anomalie détectée. JWKS : une clé ES256 active.
- Fichiers déployés : 4 outils présents avec tri par score et pagination ; vue `mcp_candidats` en base.
