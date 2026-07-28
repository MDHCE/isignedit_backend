import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Doc } from '../api';

export default function Dashboard() {
  const [docs, setDocs] = useState<Doc[] | null>(null);

  useEffect(() => {
    api.listDocuments().then(setDocs).catch(() => setDocs([]));
  }, []);

  return (
    <main className="page">
      <div className="kicker">Documents</div>
      <div className="row spread">
        <h1>Your signed documents</h1>
        <Link to="/new" className="btn">+ New document</Link>
      </div>

      {docs === null && <p className="empty">Loading…</p>}
      {docs?.length === 0 && <p className="empty">Nothing yet — create your first document.</p>}

      <div className="grid">
        {docs?.map((d) => (
          <Link key={d.id} to={`/documents/${d.id}`} className="card">
            <div className="row spread">
              <h3>{d.title}</h3>
              <span className={`badge ${d.status}`}>{d.status.replace(/_/g, ' ')}</span>
            </div>
            <div className="meta row">
              <span className="badge tier">{d.tier}</span>
              <span>
                {d.parties.filter((p) => p.signedAt).length}/{d.parties.length} signed
              </span>
              <span>· {d.code}</span>
              <span>· {new Date(d.createdAt).toLocaleDateString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
