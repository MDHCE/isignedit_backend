import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, EVENT_LABELS, type DocDetail } from '../api';

export default function DocumentDetail() {
  const { id = '' } = useParams();
  const [doc, setDoc] = useState<DocDetail | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    api.getDocument(id).then(setDoc).catch((e) => setError((e as Error).message));
  }, [id]);

  useEffect(reload, [reload]);

  if (error) return <main className="page"><p className="empty">{error}</p></main>;
  if (!doc) return <main className="page"><p className="empty">Loading…</p></main>;

  const act = (fn: () => Promise<unknown>) => () => fn().then(reload).catch((e) => setError((e as Error).message));

  return (
    <main className="page">
      <div className="kicker">Document</div>
      <div className="row spread">
        <h1>{doc.title}</h1>
        <span className={`badge ${doc.status}`}>{doc.status.replace(/_/g, ' ')}</span>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <span className="badge tier">{doc.tier}</span>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          Verification code: <b>{doc.code}</b> — <Link to={`/v/${doc.code}`} style={{ color: 'var(--ink-500)' }}>public proof page</Link>
        </span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
        <section className="card">
          <h3>Parties</h3>
          {doc.parties.map((p) => (
            <div className="row spread" key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid #f0f3f8' }}>
              <div>
                <b style={{ fontSize: 14 }}>{p.name}</b>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.email}</div>
              </div>
              {p.signedAt ? (
                <span className="chain-ok">✓ signed</span>
              ) : (
                <button className="btn ghost" onClick={act(() => api.sign(doc.id, p.id))}>
                  Sign as {p.name.split(' ')[0]}
                </button>
              )}
            </div>
          ))}

          {doc.trackingNumber && (
            <div className="meta" style={{ marginTop: 12 }}>
              Tracking: <b style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{doc.trackingNumber}</b>
            </div>
          )}
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn" disabled={doc.status !== 'signed'} onClick={act(() => api.dispatch(doc.id))}>
              Print &amp; post — certified
            </button>
            <button className="btn ghost" disabled={doc.status !== 'dispatched'} onClick={act(() => api.track(doc.id))}>
              Carrier scan (dev)
            </button>
            <button className="btn ghost" disabled={doc.status !== 'dispatched'} onClick={act(() => api.deliver(doc.id))}>
              Mark delivered
            </button>
          </div>
        </section>

        <section className="card">
          <div className="row spread">
            <h3>Evidence ledger</h3>
            <span className={doc.chainValid ? 'chain-ok' : 'chain-bad'}>
              {doc.chainValid ? '✓ chain intact' : '✗ chain broken'}
            </span>
          </div>
          <div className="timeline">
            {doc.events.map((e) => (
              <div className="tl-item" key={e.id}>
                <div className="tl-dot" />
                <div>
                  <b>{EVENT_LABELS[e.type] ?? e.type}</b>
                  <span>
                    {e.actor} · {new Date(e.at).toLocaleString()}
                    {typeof e.data.status === 'string' && <> · {e.data.status as string}</>}
                    {typeof e.data.location === 'string' && <> ({e.data.location as string})</>}
                    {typeof e.data.batch === 'string' && <> · {e.data.batch as string} → {e.data.recipient as string}</>}
                  </span>
                  <div className="hash">{e.hash.slice(0, 18)}…</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
