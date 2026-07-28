import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, EVENT_LABELS, type VerifyRecord } from '../api';

/** The public isigned.it/v/<code> proof page — no account, no fee, ever. */
export default function Verify() {
  const { code: urlCode } = useParams();
  const nav = useNavigate();
  const [input, setInput] = useState(urlCode ?? '');
  const [record, setRecord] = useState<VerifyRecord | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!urlCode) return;
    setError('');
    setRecord(null);
    api.verify(urlCode)
      .then(setRecord)
      .catch((e) => setError((e as Error).message));
  }, [urlCode]);

  return (
    <main className="page" style={{ maxWidth: 680 }}>
      <div className="kicker">Verification</div>
      <h1>Check a document</h1>

      <form
        className="row"
        style={{ marginTop: 20 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) nav(`/v/${input.trim()}`);
        }}
      >
        <input
          style={{ flex: 1, padding: '11px 14px', border: '1px solid var(--line)', borderRadius: 8, font: '500 15px ui-monospace, Menlo, monospace', letterSpacing: 2 }}
          placeholder="8F3K-29QT"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
        />
        <button className="btn">Verify</button>
      </form>

      {error && <p className="empty">{error}</p>}

      {record && (
        <div style={{ marginTop: 28 }}>
          <div className="verify-hero">
            <div style={{ fontSize: 11, letterSpacing: 3, opacity: 0.8 }}>DOCUMENT VERIFICATION</div>
            <div className="code">#{record.code}</div>
            <div className="row" style={{ marginTop: 10 }}>
              <span className="badge tier" style={{ background: 'rgba(255,255,255,.15)', color: '#fff' }}>{record.tier}</span>
              <span className="badge tier" style={{ background: 'rgba(255,255,255,.15)', color: '#fff' }}>
                {record.status.replace(/_/g, ' ')}
              </span>
              <span style={{ fontSize: 13 }}>
                {record.chainValid ? '✓ evidence chain intact' : '✗ evidence chain BROKEN'}
              </span>
            </div>
          </div>

          <section className="card">
            <h3>Parties</h3>
            {record.parties.map((p, i) => (
              <div className="row spread" key={i} style={{ padding: '8px 0' }}>
                <span>{p.name}</span>
                {p.signed ? <span className="chain-ok">✓ signed</span> : <span style={{ color: 'var(--muted)' }}>pending</span>}
              </div>
            ))}
          </section>

          <section className="card" style={{ marginTop: 16 }}>
            <h3>Chain of custody</h3>
            <div className="timeline">
              {record.events.map((e) => (
                <div className="tl-item" key={e.id}>
                  <div className="tl-dot" />
                  <div>
                    <b>{EVENT_LABELS[e.type] ?? e.type}</b>
                    <span>{e.actor} · {new Date(e.at).toLocaleString()}</span>
                    <div className="hash">{e.hash.slice(0, 24)}…</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
