// Texte par défaut du mail de remerciement envoyé au candidat.
// L'encart RGPD final est ajouté automatiquement par le template ; il n'est
// jamais inclus dans `body` ici et ne peut pas être retiré côté UI.

export const DEFAULT_CANDIDATE_EMAIL_SUBJECT = "Merci pour cet entretien : « {jobTitle} »";

export const DEFAULT_CANDIDATE_EMAIL_BODY = `Bonjour {firstName},

Merci d'avoir passé cet entretien pour le poste {jobTitle}.

Les réponses sont bien enregistrées et vont être analysées par l'équipe. En cas de profil retenu, un retour sera fait rapidement pour passer à l'étape suivante.

À bientôt,

L'équipe recrutement`;

export const CANDIDATE_EMAIL_TEMPLATE_KEY = "candidate-thank-you";
