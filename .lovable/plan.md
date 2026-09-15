# Remplacer contact@interw.com par hello@interw.com

L'adresse `contact@interw.com` n'existe pas. Elle apparaît à deux endroits dans le code, tous deux liés aux emails envoyés aux candidats.

## Modifications

1. **`supabase/functions/_shared/transactional-email-templates/candidate-thank-you.tsx`** (ligne 110)
   - Lien du pied de page « contact@interw.com » (texte affiché + `mailto:`) → `hello@interw.com`.
   - C'est le mail de remerciement reçu par chaque candidat après son entretien.

2. **`supabase/functions/_shared/transactional-email-templates/send-app-email.ts`** (ligne 23)
   - `DEFAULT_REPLY_TO = 'contact@interw.com'` → `'hello@interw.com'`.
   - C'est l'adresse « répondre à » par défaut de tous les emails applicatifs : si un candidat répond au mail, sa réponse ira sur hello@interw.com au lieu d'une adresse qui n'existe pas.

3. **Redéploiement** des fonctions email concernées (les modèles sont embarqués au déploiement) pour que le changement soit actif immédiatement sur les prochains envois.

## Impact

- **Build** : aucun risque, changement de texte uniquement, typage inchangé.
- **Candidats** : les prochains mails afficheront hello@interw.com et les réponses arriveront sur une boîte qui existe. Les mails déjà envoyés restent tels quels (impossible de modifier un mail déjà reçu).
- **Recruteurs** : aucun changement visible dans l'application.
- **Autres organisations / scoring / stockage** : non touchés.

## Vérification

- Recherche globale pour confirmer qu'il ne reste plus aucune occurrence de `contact@interw`.
- Aperçu du modèle de mail dans l'interface d'administration (le pied de page doit afficher hello@interw.com).

## Tests E2E après approbation

1. **Candidat** : ouvrir un parcours d'entretien de démonstration et vérifier que le mail de remerciement prévisualisé/affiché ne contient plus `contact@interw.com`.
2. **Recruteur** : ouvrir l'aperçu du modèle « Remerciement candidat » dans l'administration et vérifier le pied de page.
