

## Diagnostic — page Emails vide

### Constat
Sur `/emails`, deux sections : "Authentification" et "Notifications application". L'edge function `get-email-template-defaults` qui alimente la page importe 6 templates auth (signup, recovery, invite, magic-link, email-change, reauthentication) — ils devraient s'afficher dans la section "Authentification".

### Causes probables
Vu les logs edge function :
- `auth-email-hook` plante avec `Could not find the function public.enqueue_email` → l'infra email queue (`email_domain--setup_email_infra`) n'a **jamais été initialisée** sur ce projet.
- Conséquence côté `get-email-template-defaults` : la fonction n'a probablement jamais été déployée non plus, OU elle plante au boot car certains imports (`magic-link.tsx`, `reauthentication.tsx`) n'existent peut-être pas.

→ Probabilité forte : la page affiche "Aucun template" parce que l'appel à `get-email-template-defaults` retourne une erreur silencieuse (capturée par le `toast` mais le user n'a peut-être pas vu passer le toast), ou retourne `templates: []`.

### Plan d'action

**1. Vérifier l'état actuel** (1 min, en mode default)
- Tester l'edge function `get-email-template-defaults` pour voir ce qu'elle retourne réellement
- Vérifier que les 6 fichiers `_shared/email-templates/*.tsx` existent bien (notamment `magic-link.tsx` et `reauthentication.tsx`)
- Vérifier les logs récents de la function

**2. Si templates manquants ou function en erreur** → corriger
- Soit recréer les templates manquants (rapide)
- Soit déployer/redéployer `get-email-template-defaults`

**3. Améliorer l'UX d'erreur sur la page**
- Si l'appel échoue, afficher un message d'erreur explicite dans l'UI (pas juste un toast qui passe) avec un bouton "Réessayer", au lieu de "Aucun template" qui est ambigu.

**4. (Hors scope immédiat mais à signaler)** — `auth-email-hook` est cassé : les emails auth ne partent pas via la queue. Il faut lancer `email_domain--setup_email_infra` pour réparer. À traiter séparément quand tu veux que les customisations soient effectivement envoyées.

### Question avant de coder
Une seule chose à confirmer :

**Tu veux que je :**
- **A.** Juste diagnostiquer + remettre la page Emails fonctionnelle (afficher les 6 templates auth), sans toucher à l'envoi réel des emails personnalisés
- **B.** Diagnostiquer + remettre la page + **réparer toute la chaîne d'envoi** (`setup_email_infra` + redéploiement `auth-email-hook`) pour que tes personnalisations soient effectivement envoyées aux destinataires

Je recommande **B** — sinon tu pourras éditer les templates dans l'UI mais ils ne seront jamais envoyés (auth-email-hook plante actuellement à chaque inscription/invitation).

