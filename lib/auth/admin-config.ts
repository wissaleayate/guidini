/**
 * ====================================================================
 * GUIDINI: Server-Side Single Admin Configuration
 * ====================================================================
 *
 * This configuration enforces the Single Admin Account constraint.
 * Only the explicitly configured administrator account is authorized
 * to access the Admin Dashboard and manage shared curriculum data.
 *
 * Client-submitted role data is NEVER trusted.
 */

export const DEFAULT_AUTHORIZED_ADMIN_EMAIL = 'delegue.medecine@univ.dz';

/**
 * Retrieve the canonical authorized Admin email from server environment
 */
export function getAuthorizedAdminEmail(): string {
  const envEmail = process.env.ADMIN_EMAIL;
  if (envEmail && envEmail.trim().length > 0) {
    return envEmail.trim().toLowerCase();
  }
  return DEFAULT_AUTHORIZED_ADMIN_EMAIL.toLowerCase();
}

/**
 * Retrieve the optional stable Admin User ID from server environment
 */
export function getAuthorizedAdminUserId(): string | null {
  const envId = process.env.ADMIN_USER_ID;
  if (envId && envId.trim().length > 0) {
    return envId.trim();
  }
  return null;
}

/**
 * Verify if the given user identity matches the configured administrator identity.
 * Evaluated strictly on the server.
 */
export function isAuthorizedAdminIdentity(user: { id?: string; email?: string | null } | null): boolean {
  if (!user) return false;

  const stableId = getAuthorizedAdminUserId();
  if (stableId && user.id && user.id === stableId) {
    return true;
  }

  const authorizedEmail = getAuthorizedAdminEmail();
  if (user.email && user.email.trim().toLowerCase() === authorizedEmail) {
    return true;
  }

  return false;
}
