export const ADMIN_EMAIL = "pramodxxpc@gmail.com";

export type AccountRole = "student" | "moderator" | "admin";

export type DirectoryPerson = {
  id: string;
  email: string;
  name: string;
  role: AccountRole;
  signedIn: boolean;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isAdministratorEmail(email: string | null | undefined) {
  return normalizeEmail(email ?? "") === ADMIN_EMAIL;
}
