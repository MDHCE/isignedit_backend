# iSigned.it — Application Monorepo

Stage 1 development scaffold (IT Architecture v1.4): one TypeScript codebase,
three deliverables.

| Package    | What                                            | Run                              |
|------------|-------------------------------------------------|----------------------------------|
| `backend/` | Fastify API — documents, multi-party signing, hash-chained evidence ledger, public verification | `cd backend && npm run dev` (:4820) |
| `web/`     | Customer web app — Vite + React, ink-wash design system | `cd web && npm run dev` (:5173, proxies /api) |
| `mobile/`  | Expo app — documents list, QR/code verification | `cd mobile && npm start`          |

## Domain model (backend/src/types.ts)

Document → parties (multi-party, tier SES/AdES/QES) → status flow
`awaiting_signatures → signed → dispatched → delivered`.

Every state change appends an **EvidenceEvent** to a hash-chained ledger
(sha256 over canonical serialisation + previous hash). `GET /api/verify/:code`
recomputes the chain — the public page shows *proof, not assertions*
(Architecture §1.1). Metadata only; never document content.

## Docker (everything containerized, incl. Zitadel)

```bash
docker compose up -d --build
# web http://localhost:8081 · API http://localhost:4820 · Zitadel http://localhost:8080
```

Auth starts in dev mode; after provisioning Zitadel (SETUP-ZITADEL.md +
`zitadel/provision.mjs`) set `ZITADEL_ISSUER`/`ZITADEL_CLIENT_ID` in `.env` and
rebuild. `docker-compose.prod.yml` is the newton/Traefik stack for
app.isigned.it / api.isigned.it / auth.isigned.it (needs those DNS records).

## Dev notes

- Store is a JSON file (`backend/data/`) behind a repository API — swap for
  PostgreSQL without touching the chain logic.
- A demo document is seeded on first boot (fully signed + dispatched).
- Auth: **Zitadel OIDC** wired end-to-end (backend JWT validation, web PKCE
  flow, owner-scoped documents/batches). Runs anonymously in dev mode until
  configured — see `SETUP-ZITADEL.md` (in Docker, Zitadel ships in the same compose stack) for registration, Google/Apple/Microsoft
  IdPs, and passkey/OTP MFA.
- Mobile `API_BASE` points at localhost — set your LAN IP when running
  Expo Go on a device.
