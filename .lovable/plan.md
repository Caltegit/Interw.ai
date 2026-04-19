
## Diagnostic

J’ai identifié la vraie cause dans les logs du système d’envoi :

```text
Email API error: 400 {"type":"invalid_email","message":"Invalid 'reply_to' email address"}
```

Le rapport est bien généré puis mis en file d’envoi, mais l’envoi échoue ensuite parce que `reply_to` reçoit parfois une adresse candidat invalide ou vide.

Aujourd’hui :
- `generate-report` enfile `reply_to: session.candidate_email`
- `InterviewLanding.tsx` laisse démarrer une session dès que le champ email n’est pas vide
- le champ est `type="email"`, mais il n’y a pas de vraie validation côté logique avant insertion

Donc si un candidat saisit un email mal formé, le rapport est généré, mais l’email au recruteur échoue ensuite.

## Plan de correction

### 1. Sécuriser l’envoi du rapport côté backend
Dans `supabase/functions/generate-report/index.ts` :
- ajouter une validation simple de l’email candidat
- ne renseigner `reply_to` que si l’adresse est valide
- sinon envoyer quand même le rapport sans `reply_to`

Effet attendu :
- le recruteur reçoit le rapport même si l’email candidat est faux
- seul le “répondre à” sera omis dans ce cas

### 2. Bloquer les emails invalides dès le début du parcours candidat
Dans `src/pages/InterviewLanding.tsx` :
- valider réellement `candidateEmail.trim()` avant création de session
- afficher un message d’erreur clair si l’email n’est pas valide
- désactiver le bouton “Continuer” tant que nom + email valide ne sont pas fournis

Effet attendu :
- on évite de créer des sessions avec un email candidat inutilisable
- meilleure qualité des données et moins d’échecs d’envoi ensuite

### 3. Améliorer le diagnostic
Toujours dans `generate-report` :
- journaliser explicitement quand `reply_to` est ignoré car invalide
- garder les logs d’enfilement/envoi plus lisibles pour les prochains cas

## Fichiers concernés
- `supabase/functions/generate-report/index.ts`
- `src/pages/InterviewLanding.tsx`

## Résultat attendu après correctif
- un rapport part même si l’email candidat est mal saisi
- si l’email candidat est valide, il reste utilisé dans le champ “répondre à”
- les nouvelles sessions empêcheront les saisies d’email invalides

## Vérification prévue
1. Créer une session avec un email invalide :
   - la page doit bloquer avant démarrage
2. Forcer un cas existant avec email invalide :
   - le rapport doit quand même partir au recruteur
   - sans `reply_to`
3. Créer une session avec un email valide :
   - le rapport doit être reçu normalement
   - avec `reply_to` correct
4. Vérifier les logs d’envoi pour confirmer la disparition de l’erreur `Invalid 'reply_to' email address`
