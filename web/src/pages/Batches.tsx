import { useCallback, useEffect, useState } from 'react';
import { api, type Batch, type Doc } from '../api';

/** Recurring certified delivery — e.g. every week, everything to the accountant. */
export default function Batches() {
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    Promise.all([api.listBatches(), api.listDocuments()])
      .then(([b, d]) => {
        setBatches(b);
        setDocs(d);
      })
      .catch((e) => setError((e as Error).message));
  }, []);
  useEffect(reload, [reload]);

  return (
    <main className="page">
      <div className="kicker">Batched delivery</div>
      <div className="row spread">
        <h1>Standing deliveries</h1>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close' : '+ New batch'}
        </button>
      </div>
      <p style={{ color: 'var(--muted)', marginTop: 8, maxWidth: 560 }}>
        Documents collect in the open cycle and go out together as one certified envelope —
        weekly or monthly, to a standing recipient like your accountant.
      </p>

      {showForm && <NewBatchForm onDone={() => { setShowForm(false); reload(); }} />}
      {error && <p className="empty">{error}</p>}
      {batches?.length === 0 && !showForm && <p className="empty">No batches yet.</p>}

      <div className="grid">
        {batches?.map((b) => (
          <BatchCard key={b.id} batch={b} docs={docs} onChange={reload} />
        ))}
      </div>
    </main>
  );
}

function NewBatchForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('Weekly to accountant');
  const [rName, setRName] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rAddress, setRAddress] = useState('');
  const [cadence, setCadence] = useState<Batch['cadence']>('weekly');
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="card"
      style={{ marginTop: 20 }}
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        api
          .createBatch({ name, cadence, recipient: { name: rName, email: rEmail, address: rAddress } })
          .then(onDone)
          .finally(() => setBusy(false));
      }}
    >
      <div className="field">
        <label>Batch name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="row">
        <div className="field" style={{ flex: 1 }}>
          <label>Recipient</label>
          <input placeholder="Studio Rossi Commercialisti" value={rName} onChange={(e) => setRName(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>E-mail</label>
          <input type="email" placeholder="studio@rossi.it" value={rEmail} onChange={(e) => setREmail(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Postal address</label>
        <input placeholder="Corso Buenos Aires 45, 20124 Milano" value={rAddress} onChange={(e) => setRAddress(e.target.value)} required />
      </div>
      <div className="field">
        <label>Cadence</label>
        <select value={cadence} onChange={(e) => setCadence(e.target.value as Batch['cadence'])}>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <button className="btn" disabled={busy}>Create batch</button>
    </form>
  );
}

function BatchCard({ batch, docs, onChange }: { batch: Batch; docs: Doc[]; onChange: () => void }) {
  const [pick, setPick] = useState('');
  const inCycle = docs.filter((d) => batch.documentIds.includes(d.id));
  const addable = docs.filter((d) => !batch.documentIds.includes(d.id) && d.status !== 'awaiting_signatures');

  return (
    <div className="card">
      <div className="row spread">
        <h3>{batch.name}</h3>
        <span className="badge tier">{batch.cadence}</span>
      </div>
      <div className="meta">
        → {batch.recipient.name} · {batch.recipient.address}
        <br />
        Next send: {new Date(batch.nextSendAt).toLocaleDateString()} · {batch.documentIds.length} document
        {batch.documentIds.length === 1 ? '' : 's'} in the open cycle
      </div>

      {inCycle.length > 0 && (
        <ul style={{ margin: '10px 0 0 18px', fontSize: 13.5 }}>
          {inCycle.map((d) => (
            <li key={d.id}>
              {d.title} <span style={{ color: 'var(--muted)' }}>({d.code})</span>
            </li>
          ))}
        </ul>
      )}

      <div className="row" style={{ marginTop: 14 }}>
        <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ flex: 1, padding: 9, border: '1px solid var(--line)', borderRadius: 8, font: '400 13.5px Montserrat, sans-serif' }}>
          <option value="">Add a signed document…</option>
          {addable.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title} ({d.code})
            </option>
          ))}
        </select>
        <button
          className="btn ghost"
          disabled={!pick}
          onClick={() => api.addToBatch(batch.id, pick).then(() => { setPick(''); onChange(); })}
        >
          Add
        </button>
        <button
          className="btn"
          disabled={!batch.documentIds.length}
          onClick={() => api.dispatchBatch(batch.id).then(onChange)}
        >
          Send cycle now
        </button>
      </div>

      {batch.shipments.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <b style={{ fontSize: 13 }}>Shipments</b>
          <div className="timeline">
            {batch.shipments.map((s) => (
              <div className="tl-item" key={s.trackingNumber}>
                <div className="tl-dot" />
                <div>
                  <b>{s.documentIds.length} document{s.documentIds.length === 1 ? '' : 's'} · certified envelope</b>
                  <span>{new Date(s.at).toLocaleString()}</span>
                  <div className="hash">tracking {s.trackingNumber}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
