import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Doc } from '../api';

interface PartyDraft {
  name: string;
  email: string;
}

export default function NewDocument() {
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [tier, setTier] = useState<Doc['tier']>('SES');
  const [parties, setParties] = useState<PartyDraft[]>([{ name: '', email: '' }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const setParty = (i: number, patch: Partial<PartyDraft>) =>
    setParties((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const doc = await api.createDocument({
        title,
        tier,
        parties: parties.filter((p) => p.name && p.email),
      });
      nav(`/documents/${doc.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="page" style={{ maxWidth: 640 }}>
      <div className="kicker">New document</div>
      <h1>Send something worth signing</h1>

      <form onSubmit={submit} className="card" style={{ marginTop: 28 }}>
        <div className="field">
          <label>Document title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Office lease agreement"
            required
          />
        </div>

        <div className="field">
          <label>Signature level</label>
          <select value={tier} onChange={(e) => setTier(e.target.value as Doc['tier'])}>
            <option value="SES">Simple (SES) — everyday contracts</option>
            <option value="AdES">Advanced (AdES) — identified signers</option>
            <option value="QES">Qualified (QES) — equal to handwritten</option>
          </select>
        </div>

        <div className="field">
          <label>Signing parties</label>
          {parties.map((p, i) => (
            <div className="row" key={i} style={{ marginBottom: 8 }}>
              <input
                style={{ flex: 1 }}
                placeholder="Name"
                value={p.name}
                onChange={(e) => setParty(i, { name: e.target.value })}
                required
              />
              <input
                style={{ flex: 1.4 }}
                type="email"
                placeholder="email@company.com"
                value={p.email}
                onChange={(e) => setParty(i, { email: e.target.value })}
                required
              />
            </div>
          ))}
          <button
            type="button"
            className="btn ghost"
            onClick={() => setParties((ps) => [...ps, { name: '', email: '' }])}
          >
            + Add party
          </button>
        </div>

        {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button className="btn" disabled={busy}>
          {busy ? 'Creating…' : 'Create & invite parties'}
        </button>
      </form>
    </main>
  );
}
