# Formulaire candidat : tous les champs visibles, LinkedIn par défaut

## Ce qui change
1. **Paramètres avancés > Formulaire candidat** : la liste montre tous les champs demandés, dans l'ordre du formulaire :
   - Prénom *, Nom *, E-mail * : toujours affichés, toujours obligatoires, interrupteur grisé (impossible de les retirer).
   - Tél. mobile, Poste, LinkedIn, CV, Lettre de motivation : activables, avec une étoile cliquable pour les rendre obligatoires (remplace la case « Champ obligatoire »). Étoile pleine = obligatoire, vide = facultatif.
2. **LinkedIn activé par défaut** (facultatif) pour les nouveaux postes.
3. **Page candidat** : « Votre prénom/nom » devient deux champs, « Prénom * » et « Nom * ». On enregistre « Prénom Nom » comme aujourd'hui.

## Impact
- Postes existants : inchangés (LinkedIn par défaut seulement pour les nouveaux).
- Fiches, rapports, e-mails : lisent le même nom complet, rien ne change.
- Aucun changement de base de données.
- Risque faible : un candidat doit maintenant saisir deux champs au lieu d'un.
- Visible dans l'aperçu ; publication nécessaire pour interw.com.

## Détails techniques
- `src/lib/candidateFields.ts` : `linkedin: { enabled: true, required: false }` dans `DEFAULT_CANDIDATE_FIELDS` (utilisé seulement à la création ; `mergeCandidateFields` garde les valeurs enregistrées).
- `ProjectForm.tsx` (l. 912-951) : 3 lignes fixes Prénom/Nom/E-mail en tête ; bouton étoile (`Star` lucide, rempli si `required`) à la place de la `Checkbox`.
- `InterviewLanding.tsx` : deux états `firstName`/`lastName`, validation des deux, `_name = \`${prénom} ${nom}\`.trim()`.

## Vérifications
Aperçu : création de poste (liste complète, LinkedIn activé, étoiles), page candidat (Prénom, Nom, E-mail, LinkedIn). Puis E2E candidat et recruteur (bloqués par la configuration de test déjà signalée).
