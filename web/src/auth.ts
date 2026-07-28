/**
 * Zitadel OIDC (Authorization Code + PKCE) via oidc-client-ts.
 * Without VITE_ZITADEL_ISSUER/CLIENT_ID the app runs in dev mode (anonymous).
 */
import { User, UserManager, WebStorageStateStore } from 'oidc-client-ts';

const issuer = import.meta.env.VITE_ZITADEL_ISSUER as string | undefined;
const clientId = import.meta.env.VITE_ZITADEL_CLIENT_ID as string | undefined;

export const authEnabled = Boolean(issuer && clientId);

export const userManager = authEnabled
  ? new UserManager({
      authority: issuer!,
      client_id: clientId!,
      redirect_uri: `${window.location.origin}/auth/callback`,
      post_logout_redirect_uri: window.location.origin,
      scope: 'openid profile email',
      userStore: new WebStorageStateStore({ store: window.localStorage }),
    })
  : null;

export async function currentUser(): Promise<User | null> {
  return userManager ? userManager.getUser() : null;
}

export async function accessToken(): Promise<string | null> {
  const u = await currentUser();
  return u && !u.expired ? u.access_token : null;
}

export function signIn(): void {
  void userManager?.signinRedirect();
}

export function signOut(): void {
  void userManager?.signoutRedirect();
}

/** Self-service portal on the Zitadel instance (profile, passkeys, MFA). */
export const selfServiceUrl = issuer ? `${issuer.replace(/\/$/, '')}/ui/console/users/me` : null;
