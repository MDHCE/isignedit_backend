import type { ReactNode } from 'react';

export interface PlannedItem {
  name: string;
  note: string;
  tag?: string;
}

/** Shared shell for placeholder services — real navigation, honest "planned" state. */
export default function Coming(props: {
  kicker: string;
  title: string;
  blurb: string;
  items: PlannedItem[];
  demo?: ReactNode;
}) {
  return (
    <main className="page" style={{ maxWidth: 720 }}>
      <div className="kicker">{props.kicker}</div>
      <h1>{props.title}</h1>
      <p style={{ color: 'var(--muted)', marginTop: 10, maxWidth: 560 }}>{props.blurb}</p>

      {props.demo}

      <div className="grid">
        {props.items.map((it) => (
          <div className="card" key={it.name}>
            <div className="row spread">
              <h3>{it.name}</h3>
              <span className="badge tier">{it.tag ?? 'planned'}</span>
            </div>
            <div className="meta">{it.note}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
