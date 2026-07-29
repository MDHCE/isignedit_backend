/**
 * Zitadel OIDC authentication (JWT validation via JWKS).
 *
 * Configured with ZITADEL_ISSUER (e.g. https://isigned-xyz123.zitadel.cloud)
 * and optionally ZITADEL_CLIENT_ID as the required audience.
 * Without ZITADEL_ISSUER the API runs in DEV MODE: every request is the
 * anonymous "dev-user" so the scaffold stays runnable before the IdP exists.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { rolesFromClaims, type Role } from './roles.js';

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  roles: Role[];
}

const issuer = process.env.ZITADEL_ISSUER?.replace(/\/$/, '');
const audience = process.env.ZITADEL_CLIENT_ID;

const jwks = issuer ? createRemoteJWKSet(new URL(`${issuer}/oauth/v2/keys`)) : null;

export const authEnabled = Boolean(issuer);
export const DEV_USER: AuthUser = { id: 'dev-user', name: 'Dev User', roles: [] };

/** Returns the authenticated user, DEV_USER in dev mode, or null (=401). */
export async function authenticate(authHeader?: string): Promise<AuthUser | null> {
  if (!issuer || !jwks) return DEV_USER;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(authHeader.slice(7), jwks, {
      issuer,
      ...(audience ? { audience } : {}),
    });
    if (!payload.sub) return null;
    return {
      id: String(payload.sub),
      roles: rolesFromClaims(payload as Record<string, unknown>),
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name:
        typeof payload.name === 'string'
          ? payload.name
          : typeof payload.preferred_username === 'string'
            ? payload.preferred_username
            : undefined,
    };
  } catch {
    return null;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
}
