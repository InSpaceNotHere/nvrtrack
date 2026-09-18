export const MIN_PASSWORD_LENGTH = 8;

export function mapAuthErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email before logging in.";
  }

  if (normalized.includes("user already registered")) {
    return "An account with this email already exists.";
  }

  if (normalized.includes("password")) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  return "Unable to complete authentication right now. Please try again.";
}
