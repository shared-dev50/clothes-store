export interface PasswordRulesState {
  minLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export const checkPasswordRules = (password: string): PasswordRulesState => {
  return {
    minLength: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
  };
};

export const validateClientPassword = (password: string): { isValid: boolean; message?: string } => {
  const rules = checkPasswordRules(password);

  if (!rules.minLength) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!rules.hasLetter) {
    return { isValid: false, message: 'Password must contain at least one letter.' };
  }
  if (!rules.hasNumber) {
    return { isValid: false, message: 'Password must contain at least one number.' };
  }
  if (!rules.hasSpecial) {
    return { isValid: false, message: 'Password must contain at least one special character (!@#$%^&*).' };
  }

  return { isValid: true };
};
