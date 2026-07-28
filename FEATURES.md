# iSigned.it — Functions & Features by Role

Status legend: ✅ implemented (dev scaffold) · 🔲 placeholder in UI · 📋 planned (per Architecture/Journey docs)

## Roles

| Role | Who | Trust level |
|---|---|---|
| **Initiator** | Creates/uploads the contract, configures signing, pays the basket | Registered account (social login) |
| **Counterparty** | Co-signer; guest link for SES, registered + identity-proofed for AdES/QES | Tier-dependent |
| **Verifier** | Anyone holding the paper — court clerk, bank, landlord | Public, anonymous, free |
| **Attorney** | Contracted professional: validates contracts, supervises video sessions | Vetted network member |
| **Print operator** | Runs the Print Station at the ISO 14298 site | TPM-bound device + FIDO2, roles assigned by iSigned.it |
| **Platform admin / Compliance** | Operations, audit, incident response | Internal, JIT access |

## Initiator

| Feature | Status | Where |
|---|---|---|
| Create document, choose signature tier (SES/AdES/QES) | ✅ | web `/new`, API `POST /api/documents` |
| Multi-party invitations (any number, roles) | ✅ basic | parties on create; sequential order & deadlines 📋 |
| Signing status board | ✅ | web `/documents/:id` |
| Dispatch to certified print & post | ✅ stub | API `/dispatch` (real Print Station queue 📋 Stage 1) |
| Delivery tracking in document history | ✅ | tracking number on dispatch; `TRACKING_UPDATE` carrier scans in the evidence chain (`POST /:id/tracking` = webhook stand-in); shown on detail + verify pages |
| **Batched delivery** — standing recipient, weekly/monthly cycles | ✅ | web `/batches`: documents collect in the open cycle → one certified envelope (`BATCH_ADDED`/`BATCH_DISPATCHED` in each doc's chain); auto-send scheduler 📋 |
| **AI document generation** (draft + improve, per contract) | 🔲 | web `/draft` — Contract Intelligence service 📋 |
| **Attorney validation** (extra, per review) | 📋 | reachable from `/draft` risk flags |
| **Video session** booking (extra, per session) | 🔲 | web `/video` |
| **Payment** — pay-per-use basket, checkout, invoices | 🔲 | web `/billing` |
| **Address book** — contacts, addresses, identity status | 🔲 | web `/contacts` |
| **Profile** — social login, assurance level, visual signature | 🔲 | web `/profile` (live session box when auth on) |
| **Authentication** — Zitadel OIDC: registration, Google/Apple/Microsoft, passkey MFA | ✅ wired | backend JWT validation + owner-scoped data; web PKCE sign-in; dev mode without config; IdP setup = SETUP-ZITADEL.md |

## Counterparty

| Feature | Status |
|---|---|
| Sign a document (per party) | ✅ dev (buttons on detail page; guest-link flow with e-mail invitations 📋) |
| Request changes → AI merge → re-approval loop | 📋 |
| Identity proofing at AdES/QES (eID / NFC / video-ident) | 📋 |
| Order own certified copies | 📋 |
| Post-signing account conversion | 📋 |

## Verifier (public)

| Feature | Status |
|---|---|
| Verify by code / QR — parties, tier, status | ✅ web `/v/:code`, mobile Verify tab |
| Hash-chained evidence ledger, recomputed on every request | ✅ `GET /api/verify/:code` |
| Print attestation & delivery events visible | ✅ (stub events) |
| Attorney-session attestation shown | 📋 |
| Machine-verification proof API for counterparty systems | 📋 Stage 2 |

## Attorney

| Feature | Status |
|---|---|
| Validation queue: review, tracked changes, opinion | 📋 Stage 2 |
| Video session console (identity results, consent, per-party release) | 📋 Stage 2 — continuity rules platform-enforced (ETSI TS 119 461) |
| Marketplace profile: availability, fees, jurisdictions | 📋 Stage 3 |

## Print operator

| Feature | Status |
|---|---|
| Print Station app (Windows): job pull, in-memory print, QR closed loop | 📋 Stage 1 — see Architecture §3.4 |
| Signed print attestations → evidence ledger | ✅ event type exists (`PRINT_ATTESTED`), station stubbed |

## Platform admin / Compliance

| Feature | Status |
|---|---|
| Evidence-chain integrity monitoring (chain recompute) | ✅ primitive (`chainValid`) |
| Custody-anomaly alerts (job without attestation, …) | 📋 SIEM, Stage 1 |
| Retention & GDPR deletion schedules | 📋 |
| Jurisdiction workflow configuration | 📋 Stage 2 |

## Cross-cutting placeholders now visible in the apps

Web top nav: **AI Draft · Video · Contacts · Payment · Profile** — each a real route with
the planned capability list and pricing model. Mobile Account tab lists the same five
services marked **SOON**. All map to Journey v1.2 extensions and Architecture v1.4 components.
