export const PASSWORD_MIN_LENGTH = 8;

export const validatePassword = (password: string) => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return "Le mot de passe doit contenir au moins " + PASSWORD_MIN_LENGTH + " caractères.";
  }
  if (!/[A-Za-z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre.";
  }
  if (!/\d/.test(password)) {
    return "Le mot de passe doit contenir au moins un chiffre.";
  }
  // Optional: special character
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Le mot de passe doit contenir au moins un caractère spécial.";
  }
  return null;
};

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
