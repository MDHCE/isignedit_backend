import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Platform roles (mirrors FEATURES.md and the Zitadel project roles created
 * by zitadel/provision.mjs):
 *  - administrator: full platform operations, journal & billing access
 *  - printer:       Print Station operators at the ISO 14298 site
 *  - logistics:     collects printings, posts them, records carrier events
 *  - attorney:      contract validation & (later) video-session supervision
 *  - user:          every authenticated customer (implicit base role)
 */
export const ROLES = ['administrator', 'printer', 'logistics', 'attorney', 'user'] as const;
export type Role = (typeof ROLES)[number];

const ZITADEL_ROLES_CLAIM = 'urn:zitadel:iam:org:project:roles';

/** Extract project roles from a Zitadel token payload; 'user' is always granted. */
export function rolesFromClaims(payload: Record<string, unknown>): Role[] {
  const claim = payload[ZITADEL_ROLES_CLAIM];
  const found = new Set<Role>(['user']);
  if (claim && typeof claim === 'object') {
    for (const key of Object.keys(claim)) {
      if ((ROLES as readonly string[]).includes(key)) found.add(key as Role);
    }
  }
  return [...found];
}

/** Dev mode: all roles by default; X-Dev-Role header narrows for testing. */
export function devRoles(header: string | undefined): Role[] {
  if (!header) return [...ROLES];
  const wanted = header.split(',').map((r) => r.trim().toLowerCase());
  const roles = ROLES.filter((r) => wanted.includes(r));
  return roles.includes('user') ? roles : [...roles, 'user'];
}

export function requireRole(req: FastifyRequest, reply: FastifyReply, ...allowed: Role[]): boolean {
  if (req.user.roles.some((r) => allowed.includes(r) || r === 'administrator')) return true;
  void reply.code(403).send({ error: `requires role: ${allowed.join(' or ')}` });
  return false;
}
