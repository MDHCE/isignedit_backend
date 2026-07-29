# iSigned.it — Infrastructure TODO: DoS Protection & Geo-Redundancy

Decision (2026-07-29): **Cloudflare as the edge, AWS EU for geo-redundant compute/state**,
phased. Full rationale in the session recommendation; targets from IT Architecture §7
(ledger RPO ≤ 5 min, platform RTO ≤ 4 h).

## Phase A — now, pre-pilot (Cloudflare edge)
- [ ] Move isigned.it DNS to Cloudflare (nameservers + DNSSEC), proxy all hostnames
      (site, app., api., auth.)
- [ ] **Hide the origin**: Cloudflare Tunnel (`cloudflared` container in the prod compose)
      — no open 80/443 on newton; fallback: firewall to CF IP ranges + authenticated
      origin pulls (mTLS)
- [ ] WAF managed rules + per-surface rate limits:
      - [ ] `/api/v1/verify/*` — edge cache 30–60 s + per-IP limit (public QR surface)
      - [ ] auth endpoints — tight limits (credential stuffing)
      - [ ] Stripe webhook — no limiting; signature verification is the gate (done in code)
- [ ] Cloudflare Access (Zero Trust) in front of the Zitadel admin console
- [ ] Turnstile on early-access form + registration
- [ ] Nightly encrypted backups of newton volumes → S3 (EU region)

## Phase B — Stage 1 production (AWS EU, active-passive)
- [ ] Primary region eu-central-1 (Frankfurt); secondary eu-south-1 (Milan)
- [ ] Evidence journal + documents → **S3 with Object Lock (WORM)** + cross-region
      replication (auditor-grade immutability for the hash chains)
- [ ] Postgres (replaces JSON dev store) → RDS/Aurora + cross-region replica
- [ ] Containers → ECS Fargate (or EKS) both regions; ECR image replication
- [ ] Zitadel: primary region + warm standby, or Zitadel Cloud (decide at org creation)
- [ ] Cloudflare Load Balancing: health checks, failover, geo-steering (single control
      plane; do NOT also use Route 53 failover)
- [ ] Newton demoted to dev/staging
- [ ] **Quarterly failover + restore drill in the ops calendar — with written log**

## Phase C — Stage 2/3 (QTSP posture)
- [ ] Second region hot; documented, tested RTO/RPO evidence for ETSI EN 319 401 / DORA
- [ ] Cloudflare Regional Services / EU Data Localization Suite (EU-only edge processing);
      until then, document edge TLS processing in the DPIA
- [ ] Revisit: active-active — only with a single-writer-per-document design (hash chains)

## Explicitly deferred
- AWS Shield Advanced (~$3k/mo) — redundant while Cloudflare fronts everything
- Active-active writes across regions — consistency risk for evidence chains
