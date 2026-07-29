# iSigned.it — Release History

Versions map user requests to their implementing git commits.
Repos: **backend** = MDHCE/isignedit_backend (this repo, incl. web) ·
**mobile** = MDHCE/isignedit_mobilApp · **website** = MDHCE/isignedit_website

## Backend + Web (this repo)

### v0.6.0 — 2026-07-29 · `c96b979`
**Request:** *"Add API versioning for further compatibility. Prepare the mobile app and
backend for WSS async communication, add features (login, device storage, token based
sessions). Apple Pay / Android Pay, Stripe."*
- `/api/v1/*` as the stable versioned contract (Fastify rewriteUrl; `/api/*` = deprecated alias)
- WSS channel `/api/v1/ws`: owner-scoped push of document/batch/payment events, heartbeats,
  token auth; live events emitted from create/sign/dispatch/tracking/deliver/batch
- Mobile v0.2.0: token sessions in device secure storage (expo-secure-store), Zitadel PKCE
  login (expo-auth-session) with dev-session fallback, live WS indicator, pay flow
- Stripe payments: PaymentIntents with automatic payment methods (= Apple Pay / Google Pay
  sheets), simulated mode without keys, webhook with signature verification, PPS charges
  settle to paid/paid_dev; pay buttons in web Payment page and mobile Account

### v0.5.0 — 2026-07-29 · `d97092d`
**Request:** *"I want to keep everything in Docker, also Zitadel."*
- Backend Dockerfile (multi-stage TS build, node:22-alpine, healthcheck, data volume)
- Web Dockerfile (Vite build → nginx, /api proxied to the backend service)
- Root `docker-compose.yml`: Zitadel + Postgres + backend + web in one stack
  (auth off by default; `ZITADEL_INTERNAL_URL` lets tokens keep the public issuer)
- `docker-compose.prod.yml`: newton/Traefik stack — app./api./auth.isigned.it
- Images build-verified and smoke-tested on newton

### v0.4.0 — 2026-07-29 · `145951c`
**Request:** *"Integrate Zitadel, change its appearance to isigned.it. Add solution-wide
journaling (traceability, recovery). Create roles (administrator, printer, logistics,
attorney, user). Stripe invoicing → create PPS (Pay Per Sign) tracking. Add an interface
in front of Securosys to change seamlessly later. Create a release_history file."*
- Roles from Zitadel project-role claims + dev `X-Dev-Role`; guards per endpoint
- Hash-chained solution-wide journal (`data/journal.ndjson`) + `/api/admin/journal`
- PPS metering per signature tier, Stripe invoice-item export, live usage in web Payment
- `SigningProvider` seam: dev Ed25519 (real signatures) ↔ Securosys CloudHSM TSB stub
- `zitadel/provision.mjs`: iSigned.it branding (label policy + logos) and role creation

### v0.3.0 — 2026-07-28 · `f1a9672`, `eb49069`
**Request:** *"Does it integrate Apple/Google/Microsoft logins? User registration
Zitadel okay? MFA?"* → *"go"* · *"backend repository / mobile repository split"*
- Zitadel OIDC: backend JWT via JWKS, web PKCE sign-in, owner-scoped data, dev fallback
- `SETUP-ZITADEL.md` (IdPs, MFA/passkeys), local Zitadel docker-compose
- Mobile split into its own repository (`eb49069`)

### v0.2.0 — 2026-07-28 · `9fee7d4`, `11f778e`
**Request:** *"Add tracking to history. Add batched delivery (weekly to the accountant)."*
· *"List functions/features by role; add placeholders (AI generation, video, profile,
payment, address book)."*
- Carrier tracking numbers + `TRACKING_UPDATE` events in the evidence chain
- `DeliveryBatch`: standing recipient, weekly/monthly cycles, batch events per document
- `FEATURES.md` roles×features matrix; placeholder routes web + mobile Account list

### v0.1.0 — 2026-07-28 · `af89ac9`
**Request:** *"Start the backend/frontend and mobile application."*
- Fastify backend: documents, multi-party signing (SES/AdES/QES), hash-chained
  evidence ledger, public verification; React web app (ink-wash design); Expo mobile

## Mobile (MDHCE/isignedit_mobilApp)

### v0.1.0 — 2026-07-28 · `b107848`
Initial Expo app: documents list, verification by code, account service placeholders.

## Website (MDHCE/isignedit_website) — https://isigned.it

| Commit | Request → change |
|---|---|
| `9c8af34` | Initial landing page (dark hero, bento features, pay-per-use pricing) |
| `83c2f1c` | hiq-connect.com visual guideline → light ink-wash system, content unchanged |
| `f59d234` | Original logo recolored ink-blue; hand-drawn arrows/bubbles/underlines |
| `83054fc` | More drawings (blue-band arrow, CTA underline) |
| `9dcc9e9`, `fdddccf` | Deployment: Docker + Traefik for newton, isigned.it live |
| `98c5ddc` | Business documents added under `documents/` |
| `47f424f` | Emphasize "with your real signature" (print & delivery sections) |

---
*Convention: bump minor per feature request, patch for fixes; entries link the request
wording to commits so the "why" of every change stays traceable (see also the
solution-wide journal for runtime traceability).*
