export function isValidEmail(email: string): boolean {
  return /^[A-Za-z0-9]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email.trim());
}

export function validateEmailField(email: string): string | undefined {
  if (!email.trim()) return "L'adresse e-mail est requise.";
  if (!isValidEmail(email)) return 'Adresse e-mail invalide (lettres et chiffres uniquement avant @).';
  return undefined;
}

export function validateNameField(name: string, fieldLabel: string): string | undefined {
  if (!name.trim()) return `${fieldLabel} est requis.`;
  if (!isValidName(name)) return `${fieldLabel} ne doit contenir que des lettres.`;
  return undefined;
}

export function isValidName(name: string): boolean {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ]+$/.test(name.trim());
}

// Pour la connexion : on vérifie juste que le champ n'est pas vide
export function validateRequiredPasswordField(password: string): string | undefined {
  return password ? undefined : 'Le mot de passe est requis.';
}

// Pour l'inscription / réinitialisation : on impose la règle des 8 caractères
export function validateNewPasswordField(password: string): string | undefined {
  if (!password) return 'Le mot de passe est requis.';
  if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
  return undefined;
}

export function validateConfirmPasswordField(
  password: string,
  confirmPassword: string
): string | undefined {
  if (!confirmPassword) return 'Veuillez confirmer le mot de passe.';
  if (confirmPassword !== password) return 'Les mots de passe ne correspondent pas.';
  return undefined;
}

export function validateRequiredField(value: string, message: string): string | undefined {
  return value.trim() ? undefined : message;
}