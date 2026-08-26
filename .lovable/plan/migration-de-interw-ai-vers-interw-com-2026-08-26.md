# Migration de interw.ai vers interw.com

## Ce qui change, en clair
Le site, l'application et les liens candidats passeront sur `interw.com`. L'ancien domaine `interw.ai` continue d'exister et redirige automatiquement vers le nouveau, pour que tous les liens déjà envoyés (invitations candidats, rapports partagés, e-mails) continuent de fonctionner.

## Choix à acter avant de commencer
1. **Adresse de l'application** : tout sur `interw.com` (site vitrine + application + parcours candidat), ou site vitrine sur `interw.com` et application sur `app.interw.com`. Le plan ci-dessous part sur **tout sur `interw.com`** (plus simple, aucun lien existant ne change de forme).
2. **Adresses e-mail** : bascule de `notify.interw.ai` / `hello@interw.ai` / `contact@interw.ai` vers les équivalents en `.com`. Cela demande une nouvelle vérification du domaine d'envoi (DNS) avant bascule.

## Étapes

### 1. Domaine et DNS
- Ajout de `interw.com` (et `www.interw.com`) comme domaine personnalisé du projet, certificat HTTPS automatique.
- Conservation de `interw.ai` en redirection permanente vers `interw.com`, chemin par chemin (`/sessions/x` → `/sessions/x`), pour ne casser aucun lien déjà diffusé.

### 2. Authentification
- Mise à jour de l'URL du site et des URL de redirection autorisées côté backend (connexion, invitation, réinitialisation de mot de passe, liens magiques, Google).
- Ajout des deux domaines pendant la période de transition, pour qu'un lien reçu la veille fonctionne encore.

### 3. E-mails
- Vérification DNS du nouveau domaine d'envoi en `.com` (SPF, DKIM, DMARC), puis bascule de l'expéditeur.
- Mise à jour des adresses affichées : expéditeur, réponse, contact, pieds de page des modèles.
- Période de recouvrement : l'ancien domaine reste vérifié quelques semaines, le temps de confirmer la bonne délivrabilité.

### 4. Contenus et liens dans l'application
- Remplacement du domaine dans les liens en dur : liens de rapports dans les e-mails, liens de sessions, invitations, relances, rappels d'abandon, alertes internes, rapport de santé quotidien.
- Textes visibles : mentions légales, page confidentialité, page publique d'organisation, aide sur les liens candidats, aperçu de l'expéditeur dans les fenêtres d'envoi, exemple de lien dans la page d'accueil, préfixe `interw.ai/o/` dans les paramètres d'organisation.
- Balises de référencement de la page d'accueil (adresse canonique, partage social, données structurées).

### 5. Référencement
- Adresse canonique pointant sur `interw.com`.
- Redirections permanentes depuis `.ai` : le référencement acquis se transfère progressivement.
- Déclaration du nouveau domaine dans les outils de suivi de recherche et mise à jour du fichier `robots.txt` / plan de site.

### 6. Vérifications après bascule
- Un lien candidat `.ai` existant s'ouvre bien sur `.com` et l'entretien se déroule normalement.
- Connexion, invitation d'un membre, réinitialisation de mot de passe.
- Envoi d'un rapport et d'un partage de rapport : le lien pointe sur `.com` et s'ouvre.
- Réception d'un e-mail de test hors organisation (Gmail, Outlook) sans passage en indésirable.

## Détails techniques
- Occurrences en dur repérées : 12 fichiers dans `src/`, 20 fichiers dans `supabase/functions/` (dont les modèles d'e-mails partagés), `index.html`, constantes de tests E2E.
- Les valeurs de domaine seront centralisées : une constante unique côté application et une variable d'environnement `PUBLIC_APP_URL` / `SITE_URL` côté fonctions serveur, au lieu des chaînes répétées. Les fonctions concernées seront redéployées.
- Aucune modification de base de données n'est nécessaire : les liens sont reconstruits à partir des identifiants et du domaine, pas stockés en dur. Les jetons de session, les partages de rapports et les invitations restent valides.
- Adresses e-mail techniques de test (`e2e-test@…`) mises à jour dans la configuration des tests.

## Risques et points de vigilance
- **Délivrabilité e-mail** : un domaine d'envoi neuf part sans réputation. Bascule progressive recommandée et surveillance du journal d'envois pendant deux semaines.
- **Ne jamais couper `interw.ai`** : la redirection doit rester en place durablement, des liens candidats circulent encore par e-mail.
- **Connexion Google** : si le domaine autorisé n'est pas mis à jour au même moment que la bascule, la première connexion échoue.
