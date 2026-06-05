// Texte par défaut du mail de remerciement envoyé au candidat.
// L'encart RGPD final est ajouté automatiquement par le template ; il n'est
// jamais inclus dans `body` ici et ne peut pas être retiré côté UI.

export const DEFAULT_CANDIDATE_EMAIL_SUBJECT = "Merci pour votre entretien";

export const DEFAULT_CANDIDATE_EMAIL_BODY = `Bonjour {firstName},

Merci d'avoir passé votre entretien pour le poste de {jobTitle} chez {orgName}.

Vos réponses ont bien été enregistrées et vont être analysées par l'équipe de recrutement. Vous serez recontacté(e) prochainement.

À bientôt,
L'équipe de recrutement`;

export const CANDIDATE_EMAIL_TEMPLATE_KEY = "candidate-thank-you";
