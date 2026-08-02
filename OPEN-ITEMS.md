# iSigned.it — Open Items (as of 2026-07-29)

What exists, what's missing, who has to do it. Costs are **rough ballparks** for
planning only — every one needs a real quote.

**Legend:** 🔴 blocks the pilot · 🟡 needed before real customers · 🟢 later stage
**Owner:** 👤 = you (accounts, money, signatures) · 💻 = engineering (Claude can do)

---

## ✅ What's already live

| Thing | State |
|---|---|
| isigned.it landing page | Live, TLS, Docker on newton |
| app / api / auth .isigned.it | Live, TLS (wildcard DNS), Docker + Traefik |
| Backend API v1 | Documents, multi-party signing (SES/AdES/QES), hash-chained evidence ledger, public verification, tracking, batched delivery, roles, journal, PPS metering |
| Zitadel | Running at auth.isigned.it, first admin created (`isigned-admin@isignedit.auth.isigned.it`) |
| Web app | Dashboard, new document, detail + evidence timeline, verify, batches, service placeholders |
| Mobile (iOS) | Runs in simulator, live WSS, token sessions in Keychain, pay flow |
| Signing seam | `SigningProvider` interface; dev Ed25519 real signatures; Securosys TSB provider stubbed |
| Payments | Stripe PaymentIntent flow (Apple/Google Pay ready), simulated without keys, webhook verification |
| Docs | Proposal v3.3, Architecture v1.4, Journey v1.2, FEATURES, TODO (DoS/geo-redundancy), RELEASE_HISTORY |

---

## 1. 👤 Accounts & registrations to create

### 1.1 Identity & login
| # | Item | Where | Cost | Lead time | Blocks |
|---|---|---|---|---|---|
| 🔴 1 | **Finish Zitadel setup** — log in, change password, create service user + Org Owner PAT | auth.isigned.it | free (self-hosted) | minutes | branding, roles, all real login |
| 🔴 2 | **Google OAuth client** (Web) | console.cloud.google.com → Credentials | free | ~30 min | "Sign in with Google" |
| 🟡 3 | **Microsoft Entra app registration** | portal.azure.com | free | ~30 min | "Sign in with Microsoft" |
| 🟡 4 | **Apple Developer Program** → App ID + **Services ID** + Sign-in key (.p8) | developer.apple.com | **$99/yr** | 1–2 days (approval) | "Sign in with Apple" **and** any iOS distribution |

### 1.2 Payments
| # | Item | Where | Cost | Notes |
|---|---|---|---|---|
| 🔴 5 | **Stripe account** + business verification (KYC: company docs, IBAN, ID) | stripe.com | ~1.5% + €0.25 per EU card | 1–3 days for verification |
| 🔴 6 | Stripe **API keys** (test + live) + **webhook endpoint** → `https://api.isigned.it/api/v1/payments/webhook` | Stripe dashboard | — | gives `STRIPE_*` env values |
| 🟡 7 | **Apple Pay**: merchant ID + domain verification file hosted on app.isigned.it | Stripe → Payment methods | — | needs #4 |
| 🟡 8 | **Google Pay**: merchant registration | Stripe → Payment methods | — | — |
| 🟡 9 | **Stripe Tax** (EU VAT / OSS) or an accountant's VAT setup | Stripe / advisor | ~0.5% | required for real invoicing |

### 1.3 Cryptography — the trust core
| # | Item | Where | Cost | Notes |
|---|---|---|---|---|
| 🔴 10 | **Securosys CloudsHSM account** — contact sales, sign contract | securosys.com | **quote needed** (subscription; typically 3-figure €/mo and up) | prerequisite for real signatures |
| 🔴 11 | TSB endpoint URL + **API key**; create signing key with **Smart Key Attributes** (SCAL2 approval rules) | Securosys portal | included | fills `SECUROSYS_*` env |
| 🔴 12 | **Partner QTSP** for Stage-1 qualified certificates (Skribble / Yousign / InfoCert / Namirial…) | vendor contract | per-signature or subscription | QES before your own QTSP status |
| 🟢 13 | Own **QTSP status** — conformity assessment + supervisory-body listing | accredited auditor + national body | **rough €30–80k+** | Stage 3; 12–18 months |

### 1.4 Fulfilment — the physical half
| # | Item | Where | Cost | Notes |
|---|---|---|---|---|
| 🔴 14 | **ISO 14298 print partner** contract (2–3 sites) | Intergraf certified-site database | per-unit pricing | the product's core promise |
| 🔴 15 | **Postal carrier business account** + tracking API (Poste Italiane / Magyar Posta / DHL) | carrier | per-item | registered/tracked delivery |
| 🟡 16 | Print Station **host PC** at the partner site (TPM, BitLocker, EDR) | hardware | ~€800–1500 | who funds it: negotiate |

### 1.5 Infrastructure & operations
| # | Item | Where | Cost | Notes |
|---|---|---|---|---|
| 🟡 17 | **Cloudflare account** + move isigned.it nameservers | cloudflare.com | free → Pro $25/mo → Business $250/mo | DoS protection, WAF, Tunnel, Turnstile |
| 🟡 18 | **AWS account** (EU: Frankfurt + Milan) | aws.amazon.com | usage-based | geo-redundancy phase B |
| 🟡 19 | **Transactional e-mail** provider + SPF/DKIM/DMARC (Postmark / SES) | vendor | ~€15/mo | invitations, reminders — nothing works without it |
| 🟢 20 | **Google Play Console** | play.google.com/console | **$25 once** | Android distribution |
| 🟢 21 | Error/uptime monitoring (Sentry, Better Stack) | vendor | free tiers exist | — |

### 1.6 Services for later features
| # | Item | Cost | Notes |
|---|---|---|---|
| 🟡 22 | **EU-hosted LLM** for Contract Intelligence (Bedrock EU / Azure OpenAI EU / Mistral) | usage | no-training-on-data terms are mandatory |
| 🟢 23 | **Identity-proofing / video-ident** provider (or eIDAS eID / EUDI Wallet integration) | per-check | needed for AdES/QES step-up |
| 🟢 24 | **Attorney/notary network** contracts per jurisdiction | fee split | validation + video sessions |

### 1.7 Company, legal, insurance
| # | Item | Cost (rough) | Notes |
|---|---|---|---|
| 🔴 25 | **Legal opinions** on physically reproduced digital signatures — DE, FR, HU, IT | €3–15k per market | Phase 0 gate; the thesis stands or falls here |
| 🔴 26 | **Terms of Service, Privacy Policy, Cookie Policy, DPA template** | €2–6k | legally required before customers |
| 🟡 27 | **EUIPO trademark** "iSigned.it" | €850+ per class | brand protection |
| 🟡 28 | **Professional indemnity insurance** | varies | intermediating between clients and attorneys |
| 🟡 29 | **DPIA** + subprocessor DPAs (printers, Stripe, Cloudflare, LLM…) | internal + counsel | GDPR obligation |
| 🟢 30 | **DPO** appointment (if scale/sensitivity requires) | varies | assess with counsel |

---

## 2. 💻 Engineering — must-have before a pilot

| # | Item | Why it's not optional |
|---|---|---|
| 🔴 31 | **Automated tests** (unit + integration + e2e) — currently **zero** | A trust product heading for an ETSI audit cannot ship untested; the evidence chain especially needs regression coverage |
| 🔴 32 | **PostgreSQL migration** (replace the JSON dev store) | JSON files don't survive concurrency, scale, or backup requirements |
| 🔴 33 | **Real document handling**: PDF upload, encrypted object storage, page hashing, **PAdES signature embedding**, visual-signature rendering | today "documents" are titles — no actual file is signed or printed |
| 🔴 34 | **GDPR hardening**: retention schedules + automated deletion, erasure-safe chains (PII off-chain, salted hashes in events), encryption at rest, consent records, data export | erasure vs. immutable chain must be designed, not patched |
| 🔴 35 | **Guest signing links** (counterparties without accounts) | the whole "no account needed" promise on the landing page |
| 🔴 36 | **Public verification at isigned.it/v/&lt;code&gt;** | it's printed on every document and promised on the landing page — currently only served under app.isigned.it |
| 🔴 37 | **E-mail/notification service** (invitations, reminders, delivery notices) | nobody can be invited to sign today |
| 🔴 38 | **Securosys wiring + real signature flow** (once #10–11 exist), incl. SCAL2 activation UX | replaces the dev Ed25519 provider |
| 🔴 39 | **Print Station** Windows app (.NET WinUI, TPM device identity, in-memory print, QR closed-loop attestation) | the fulfilment half of the product; sizeable project |
| 🟡 40 | Stripe live wiring: mobile payment sheet (`@stripe/stripe-react-native`), Apple/Google Pay config, invoices, VAT | payments today are simulated |
| 🟡 41 | **Job queue + scheduler** (batch auto-send, reminders, deadlines, retries) | batches need manual dispatch right now |
| 🟡 42 | **Carrier webhook** integration replacing the dev tracking endpoint | real tracking events |
| 🟡 43 | **Sequential signing order, deadlines, decline flow** | multi-party is parallel-only today |
| 🟡 44 | **CI/CD** (GitHub Actions: typecheck, test, build, deploy) + staging environment | deploys are manual rsync today |
| 🟡 45 | **Observability**: OpenTelemetry, log aggregation, alerting, uptime checks | you cannot operate blind |
| 🟡 46 | **Backups + tested restore** of volumes/DB (and the journal's WORM copy) | data loss is existential for an evidence platform |
| 🟡 47 | **API rate limiting** at app level (defence in depth behind Cloudflare) | abuse protection |
| 🟡 48 | **OpenAPI spec + partner API docs** | the API-first channel strategy |
| 🟡 49 | **Admin console UI** (journal viewer, billing, role grants) | admin work is curl-only today |
| 🟡 50 | **Accessibility pass** (WCAG 2.1 AA — European Accessibility Act applies to services) | legal requirement in the EU |
| 🟢 51 | Address book, profile/visual signature, AI drafting, video sessions, attorney workflows | the five placeholders |
| 🟢 52 | Mobile: QR scanner, push notifications, Android build, TestFlight/store submissions | — |
| 🟢 53 | Cloudflare Tunnel container + WAF rules (TODO.md Phase A) | origin hiding |
| 🟢 54 | AWS geo-redundancy (TODO.md Phase B) + quarterly failover drills | RPO/RTO targets |

---

## 3. Suggested order (dependency-driven)

1. **This week (no money needed):** finish Zitadel (#1) → I run branding+roles and turn on real login. Then #2 Google OAuth (free, 30 min) for the first social login.
2. **Unblock the product:** #5–6 Stripe, #19 e-mail, then engineering #31–37 (tests, Postgres, real PDFs, GDPR, guest links, isigned.it/v/, e-mail) — this is what turns a demo into a pilotable product.
3. **In parallel, long lead times:** #25 legal opinions, #10–12 Securosys + partner QTSP, #14–15 print & postal partners. These take weeks-to-months of *other people's* time — start them early even though they cost the most.
4. **Before customers:** #26 legal docs, #29 DPIA, #17 Cloudflare, #44–46 CI/backups/observability, #50 accessibility.
5. **Stage 2/3:** ISO 27001, own QTSP (#13), AWS geo-redundancy, video sessions and the AI service.

## 4. Honest risk notes

- **#31 (no tests) is the biggest engineering debt.** Everything built so far is verified by manual smoke tests only. Before the codebase grows further, a test suite around the evidence chain, roles, and billing is the highest-value work I can do.
- **#33 is bigger than it looks.** "Sign a document" currently means "record that a signature happened". Real PDF + PAdES + visual signature + page hashing touches signing, printing, verification and evidence all at once.
- **#39 (Print Station)** is effectively a second product. Budget accordingly.
- **#25 legal opinions gate everything commercial.** If a target market rejects physically reproduced digital signatures, the wedge changes — better to learn that before #39.
