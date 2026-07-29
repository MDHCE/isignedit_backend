import { useEffect, useState } from 'react';
import Coming from './Coming';
import { authEnabled, currentUser, selfServiceUrl } from '../auth';
import { api, type PpsUsage } from '../api';

/** AI document generation — the Contract Intelligence service (Journey Ext. A). */
export function Draft() {
  const [brief, setBrief] = useState('');
  return (
    <Coming
      kicker="AI document generation"
      title="Draft a contract from plain words"
      blurb="Describe the deal — the Contract Intelligence service drafts the full contract with
        every clause explained, then iterates on your instructions. Separate service, one price
        per contract, unlimited iterations. EU-hosted; your contracts never train any model."
      demo={
        <div className="card" style={{ margin: '24px 0 8px' }}>
          <div className="field">
            <label>Describe your deal</label>
            <textarea
              rows={4}
              style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 8, font: '400 14px Montserrat, sans-serif', resize: 'vertical' }}
              placeholder="e.g. I rent my office at Via Roma 12 to Giulia Bianchi for 24 months at €1,800/month, 3 months deposit…"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
            />
          </div>
          <button className="btn" disabled title="Arrives with the Contract Intelligence service">
            Generate draft — coming soon
          </button>
        </div>
      }
      items={[
        { name: 'Draft mode', note: 'Guided intake (parties, subject, amounts, dates, jurisdiction) → full contract in your language.', tag: 'per contract' },
        { name: 'Improve mode', note: 'Upload an existing contract — rewording, restructuring, risky-clause flags. Same per-contract price.', tag: 'per contract' },
        { name: 'Clause explanations', note: 'Every clause explained in plain language, side by side. Feeds the counterparty view too.' },
        { name: 'Change-request merge', note: 'Counterparty edits merged through the same AI loop at no extra charge; all approvals reset on any text change.' },
        { name: 'Attorney validation handoff', note: 'One tap from a risk flag to a licensed attorney review (extra, per review).', tag: 'extra' },
      ]}
    />
  );
}

/** Attorney video session — supervised execution (Journey Ext. C). */
export function Video() {
  return (
    <Coming
      kicker="Video sessions"
      title="Sign together, on camera, supervised"
      blurb="One joint video session: all parties and a contracted attorney. Identity checked on
        camera, consent captured, everyone signs during the call. EU-compliant by construction —
        if any party's stream drops, that party's identification restarts; the full session is
        recorded and sealed into the evidence ledger."
      items={[
        { name: 'Session scheduling', note: 'Initiator books; parties confirm; attorney assigned from the network by jurisdiction.', tag: 'per session' },
        { name: 'Continuity monitor', note: 'Platform-enforced ETSI TS 119 461 rules: stream integrity watched, forced re-identification on drop — the attorney cannot skip it.' },
        { name: 'Identification', note: 'eID / EUDI Wallet preferred, video-ident as fallback (AMLR 2027-proof).' },
        { name: 'Sealed recording', note: 'Encrypted, qualified-timestamped into the evidence archive; retention per jurisdiction (5+ years).' },
        { name: 'Session attestation', note: '“Executed under attorney supervision” appears on the public verification page.' },
      ]}
    />
  );
}

/** Profile & identity — tiered assurance per Architecture §3.1. */
export function Profile() {
  const [who, setWho] = useState<string | null>(null);
  useEffect(() => {
    if (authEnabled) currentUser().then((u) => setWho(u ? `${u.profile.name ?? u.profile.email} (${u.profile.sub})` : null));
  }, []);
  return (
    <Coming
      kicker="Profile"
      title="Your identity, at the right level"
      blurb="Accounts start with one-click social login. Identity proofing happens once, the first
        time a signature level legally requires it — then it is bound to your account for good."
      demo={
        <div className="card" style={{ margin: '24px 0 8px' }}>
          <h3>Session</h3>
          <div className="meta">
            {!authEnabled && 'Dev mode — no identity provider configured (see SETUP-ZITADEL.md).'}
            {authEnabled && (who ?? 'Not signed in.')}
          </div>
          {selfServiceUrl && (
            <a className="btn ghost" style={{ marginTop: 12 }} href={selfServiceUrl} target="_blank" rel="noreferrer">
              Manage passkeys &amp; MFA
            </a>
          )}
        </div>
      }
      items={[
        { name: 'Sign in with Google / Apple / Microsoft', note: 'Zitadel federation; e-mail + passkey fallback so no account depends on a third party.', tag: 'wired — configure IdPs' },
        { name: 'Identity assurance level', note: 'Shows your current level (account-only → AdES-proofed → QES-qualified) and what each unlocks.' },
        { name: 'Identity proofing', note: 'eID / NFC passport / video-ident flow, run once at first qualified signature.' },
        { name: 'Visual signature', note: 'Draw or upload the handwritten signature that is printed on your certified copies — with your real signature.' },
        { name: 'Language & notifications', note: 'Per-market language, reminder cadence, delivery notifications.' },
      ]}
    />
  );
}

/** Payment — pure pay-per-use, no subscription. PPS usage is live. */
export function Billing() {
  const [usage, setUsage] = useState<PpsUsage | null>(null);
  useEffect(() => {
    api.usage().then(setUsage).catch(() => setUsage(null));
  }, []);
  return (
    <Coming
      kicker="Payment"
      title="Pay per contract. Not per month."
      blurb="Each document is a small basket: signatures, certified copies, and any extras it
        needs. One payment at checkout; production starts when it clears. No subscription,
        no seats."
      demo={
        usage && (
          <div className="card" style={{ margin: '24px 0 8px' }}>
            <div className="row spread">
              <h3>Your PPS usage — Pay Per Sign</h3>
              <span className="badge tier">
                {usage.count} signatures · €{(usage.totalCents / 100).toFixed(2)}
              </span>
            </div>
            <div className="timeline">
              {usage.charges.slice(0, 8).map((c) => (
                <div className="tl-item" key={c.id}>
                  <div className="tl-dot" />
                  <div style={{ flex: 1 }}>
                    <b>
                      {c.tier} signature — {c.signerName}
                    </b>
                    <span>
                      {c.documentCode} · {new Date(c.at).toLocaleString()} · {c.stripeStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <b style={{ fontSize: 13.5 }}>€{(c.amountCents / 100).toFixed(2)}</b>
                </div>
              ))}
              {usage.count === 0 && <div className="meta">No signatures billed yet.</div>}
            </div>
            <div className="meta" style={{ marginTop: 10 }}>
              Charges accrue per signature and are invoiced via Stripe (pending items export
              1:1 to stripe.invoiceItems.create).
            </div>
          </div>
        )
      }
      items={[
        { name: 'PPS — Pay Per Sign', note: 'Live: every signature is metered by tier (SES/AdES/QES) and queued as a Stripe invoice item.', tag: 'live' },
        { name: 'Stripe invoicing', note: 'Pending charges export 1:1 to stripe.invoiceItems.create; monthly invoice job next.', tag: 'next up' },
        { name: 'Basket & checkout', note: 'Price events accrue per document (signatures per party/tier, copies per recipient, extras à la carte).' },
        { name: 'Payment methods', note: 'Card + SEPA via payment provider; per-country pricing with VAT handling.' },
        { name: 'Receipts & invoices', note: 'Per-document invoices; company billing profiles for B2B.' },
        { name: 'Founding rates', note: 'Early-access members lock launch pricing (per the landing-page promise).' },
      ]}
    />
  );
}

/** Address book — reuse of counterparties. */
export function Contacts() {
  return (
    <Coming
      kicker="Address book"
      title="Your counterparties, remembered"
      blurb="People and companies you sign with, their delivery addresses, and their verified
        identity status — so the second contract takes seconds to set up."
      items={[
        { name: 'Contacts & companies', note: 'Name, e-mail, role defaults; company entities with registered addresses.', tag: 'next up' },
        { name: 'Postal addresses', note: 'Validated delivery addresses for certified copies, per country.' },
        { name: 'Identity status', note: 'See whether a contact is already identity-proofed (their signatures move faster).' },
        { name: 'Recent parties', note: 'One-tap re-invite from your signing history.' },
        { name: 'GDPR controls', note: 'Contacts are yours: export and erase per data-minimisation rules.' },
      ]}
    />
  );
}
