# Le connecteur n'est pas cassé — c'est Claude qui l'a déconnecté

## Ce que montrent les vérifications faites à l'instant

- Le connecteur en ligne répond normalement : la fiche d'identification publique renvoie bien « Interw » et l'adresse d'authentification.
- L'appel sans identification renvoie exactement la réponse attendue (« il faut se connecter »), avec l'en-tête qui indique à Claude où relancer la connexion. Un serveur planté ne répondrait pas ça.
- Les quatre outils sont bien présents dans la version déployée, avec les nouveaux réglages (tri par score, pagination) et les champs de score.
- La nouvelle vue de données utilisée par « Lister les candidats » existe bien en base.

Donc : ni panne de démarrage, ni schéma d'outil invalide. C'est la troisième hypothèse — au redémarrage du connecteur, Claude a perdu son autorisation et ne réaffiche plus les outils au lieu de redemander la connexion.

## Ce qu'il faut faire

1. Dans Claude, ouvrir les paramètres du connecteur Interw, le déconnecter puis le reconnecter (se reconnecter avec le compte Interw, approuver l'écran d'autorisation).
2. Relancer une conversation neuve et demander la liste des postes : les quatre outils doivent réapparaître.
3. Tester ensuite sur un poste à plus de 100 candidats : demander « les meilleurs candidats » — la réponse doit contenir les scores et indiquer « 100 sur 213 ».

## Côté application

- Aucun correctif de code n'est nécessaire pour ce symptôme.
- Amélioration à retenir sur la page « Connexion IA » des réglages : ajouter une ligne indiquant qu'après une mise à jour du connecteur, il peut être nécessaire de le déconnecter/reconnecter dans Claude ou ChatGPT. C'est la seule modification proposée ici.

## Détails techniques

- `POST /functions/v1/mcp` → 401 + `WWW-Authenticate: Bearer realm="mcp", resource_metadata=…` : la fonction démarre et le vérificateur OAuth fonctionne.
- `/.well-known/oauth-protected-resource` → 200, `resource_name: "Interw"`.
- `supabase/functions/mcp/index.ts` déployé contient `mcp_candidats`, `sort_by`, `next_offset` ; vue `public.mcp_candidats` présente.
- Impossible de simuler `tools/list` depuis ici : un jeton de session applicatif est volontairement refusé (absence de `client_id`), seul un vrai jeton OAuth client passe. La validation finale se fait donc depuis Claude après reconnexion.
