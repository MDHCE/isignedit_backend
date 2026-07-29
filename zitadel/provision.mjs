#!/usr/bin/env node
/**
 * Provision Zitadel for iSigned.it:
 *   1. Brand the login/console with the iSigned.it identity (ink-blue palette + logo)
 *   2. Create the 'isigned' project and the five platform roles
 *      (administrator, printer, logistics, attorney, user)
 *
 * Usage:
 *   ZITADEL_ISSUER=https://<instance> ZITADEL_PAT=<personal-access-token> node provision.mjs
 *
 * The PAT needs Org Owner permissions (Console → Users → Service Users →
 * new user → Personal Access Token). Idempotent: safe to re-run.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ISSUER = process.env.ZITADEL_ISSUER?.replace(/\/$/, '');
const PAT = process.env.ZITADEL_PAT;
if (!ISSUER || !PAT) {
  console.error('Set ZITADEL_ISSUER and ZITADEL_PAT. See SETUP-ZITADEL.md.');
  process.exit(1);
}

const HERE = dirname(fileURLToPath(import.meta.url));

// iSigned.it brand (matches web ui.css / landing tokens)
const BRAND = {
  primaryColor: '#16305a',
  backgroundColor: '#ffffff',
  warnColor: '#c0392b',
  fontColor: '#2b2a29',
  primaryColorDark: '#5c8bd6',
  backgroundColorDark: '#101f3c',
  warnColorDark: '#ff8f8f',
  fontColorDark: '#e6ecf7',
  hideLoginNameSuffix: true,
  disableWatermark: true,
};

const ROLES = [
  { key: 'administrator', displayName: 'Administrator', group: 'platform' },
  { key: 'printer', displayName: 'Print Station Operator', group: 'fulfilment' },
  { key: 'logistics', displayName: 'Logistics (collects & posts printings)', group: 'fulfilment' },
  { key: 'attorney', displayName: 'Attorney', group: 'legal' },
  { key: 'user', displayName: 'User', group: 'platform' },
];

async function api(method, path, body, raw = false) {
  const res = await fetch(`${ISSUER}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAT}`,
      ...(raw ? {} : { 'Content-Type': 'application/json' }),
    },
    body: raw ? body : body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok && res.status !== 409) {
    // 409 = already exists (idempotency)
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

console.log(`Provisioning ${ISSUER} …`);

// 1) Branding — custom label policy for the organisation
console.log('→ applying iSigned.it label policy (ink-blue brand)');
await api('POST', '/management/v1/policies/label', BRAND).catch(async (e) => {
  if (String(e).includes('already exists')) {
    await api('PUT', '/management/v1/policies/label', BRAND);
  } else throw e;
});

// logo upload (light + dark) — the recolored original wordmark
for (const [asset, endpoint] of [
  ['logo_light.png', '/assets/v1/policy/label/logo'],
  ['logo_dark.png', '/assets/v1/policy/label/logo/dark'],
]) {
  try {
    const file = readFileSync(join(HERE, asset));
    const form = new FormData();
    form.append('file', new Blob([file], { type: 'image/png' }), asset);
    await api('POST', endpoint, form, true);
    console.log(`→ uploaded ${asset}`);
  } catch (e) {
    console.warn(`  (logo upload ${asset} skipped: ${e})`);
  }
}
// activate the policy
await api('POST', '/management/v1/policies/label/_activate', {}).catch(() => {});

// 2) Project + roles
console.log("→ creating project 'isigned'");
const projects = await api('POST', '/management/v1/projects/_search', { queries: [] });
let project = (projects.result ?? []).find((p) => p.name === 'isigned');
if (!project) project = await api('POST', '/management/v1/projects', { name: 'isigned' });
const projectId = project.id;

for (const role of ROLES) {
  await api('POST', `/management/v1/projects/${projectId}/roles`, {
    roleKey: role.key,
    displayName: role.displayName,
    group: role.group,
  });
  console.log(`→ role '${role.key}'`);
}

console.log(`
Done. Remaining console steps (SETUP-ZITADEL.md):
 - create the Web (PKCE) app in project 'isigned' and copy the Client ID
 - tick "Assert roles on authentication" in the app's token settings
   (adds urn:zitadel:iam:org:project:roles to tokens — the backend reads it)
 - grant roles to users (Project → Authorizations)
 - connect Google / Apple / Microsoft IdPs; enable passkeys + OTP MFA
`);
