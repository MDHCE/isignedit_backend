# Zitadel Setup — Registration, Social Login, MFA

The code is fully wired (backend JWT validation, web PKCE flow, owner-scoped data).
Without configuration both apps run in **dev mode** (anonymous `dev-user`).
The steps below need your accounts — Claude can't create them for you.

## 1. Get a Zitadel instance

**Option A — Zitadel Cloud (fastest):** create an org at https://zitadel.com
(choose an **EU region**). Your issuer is `https://<org>-<id>.zitadel.cloud`.

**Option B — self-hosted (the default here — everything runs in Docker):**
```bash
docker compose up -d --build     # Zitadel: http://localhost:8080 (+ backend, web)
```
Production equivalent: `docker-compose.prod.yml` runs Zitadel at auth.isigned.it
behind newton's Traefik (set the secrets in `.env`, add the DNS records).

## 2. Create the application

Console → Projects → *New project* `isigned` → *New application*:
- Type **Web**, auth method **PKCE** (no secret)
- Redirect URI: `http://localhost:5173/auth/callback` (add production URL later)
- Post-logout URI: `http://localhost:5173`
- Copy the **Client ID**

## 3. Configure the apps

```bash
# app/web/.env.local
VITE_ZITADEL_ISSUER=https://<your-instance>
VITE_ZITADEL_CLIENT_ID=<client-id>

# app/backend/.env  (or export in the shell that runs it)
ZITADEL_ISSUER=https://<your-instance>
ZITADEL_CLIENT_ID=<client-id>        # optional audience check
```

Restart both; the topbar shows **Sign in**, the API returns 401 without a token,
and every document/batch is scoped to its owner (Zitadel `sub`).

## 4. Branding + roles (automated)

Create a service user with **Org Owner** + a Personal Access Token, then:

```bash
ZITADEL_ISSUER=https://<your-instance> ZITADEL_PAT=<token> node zitadel/provision.mjs
```

This applies the **iSigned.it appearance** (ink-blue label policy + the wordmark
logo for light and dark login pages, watermark off) and creates the project
`isigned` with the platform roles: `administrator`, `printer`, `logistics`,
`attorney`, `user`. Then in the app's token settings tick **"Assert roles on
authentication"** so tokens carry `urn:zitadel:iam:org:project:roles` — the
backend maps them automatically; grant roles under Project → Authorizations.
Dev mode without Zitadel: all roles are granted; narrow with an `X-Dev-Role`
header (e.g. `X-Dev-Role: user`) to test the guards.

## 5. Social identity providers

Console → Settings → **Identity Providers**:

| Provider | Where to get credentials | Notes |
|---|---|---|
| **Google** | console.cloud.google.com → APIs & Services → Credentials → OAuth client (Web) | Redirect URI shown by Zitadel (`…/ui/login/login/externalidp/callback`) |
| **Microsoft** | portal.azure.com → Entra ID → App registrations → New | Also covers personal Microsoft accounts if you pick the right audience |
| **Apple** | developer.apple.com (paid account) → Identifiers: App ID + **Services ID** + Sign in with Apple key (.p8) | Required by App Store rules once the mobile app ships any third-party login |

Enable each IdP for your organization and tick **auto-register** so social sign-in
creates the account on first use (the tiered-assurance model: this is *account
access only* — identity proofing comes at first qualified signature).

## 6. MFA & passkeys

Console → Settings → **Login Behaviour and Security**:
- Passwordless/passkeys: **allowed** (WebAuthn/FIDO2 — primary factor)
- Multifactor: enable **OTP (TOTP)** and **U2F/WebAuthn**; set *Force MFA* per
  your policy (recommended: force for users without passkeys)
- Users self-manage factors at `<issuer>/ui/console/users/me` — linked from the
  app's Profile page.

## 7. What's still deliberately open

- Guest signing links (counterparties without accounts) — separate token flow, not Zitadel sessions
- Identity proofing (eID / video-ident) at AdES/QES — separate RA flow per Architecture §3.2
- Mobile: `expo-auth-session` against the same Zitadel app (native redirect URI)
- Production: register `https://app.isigned.it/auth/callback`, rotate to a dedicated backend "API" project for audience separation
