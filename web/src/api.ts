export interface Party {
  id: string;
  name: string;
  email: string;
  signedAt: string | null;
}

export interface Doc {
  id: string;
  code: string;
  title: string;
  tier: 'SES' | 'AdES' | 'QES';
  status: 'awaiting_signatures' | 'signed' | 'dispatched' | 'delivered';
  parties: Party[];
  createdAt: string;
}

export interface EvidenceEvent {
  id: string;
  type: string;
  actor: string;
  at: string;
  data: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

export interface DocDetail extends Doc {
  events: EvidenceEvent[];
  chainValid: boolean;
}

export interface VerifyRecord {
  code: string;
  tier: Doc['tier'];
  status: Doc['status'];
  parties: { name: string; signed: boolean }[];
  events: EvidenceEvent[];
  chainValid: boolean;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.json().catch(() => ({})) as { error?: string }).error ?? res.statusText);
  return res.json() as Promise<T>;
}

export const api = {
  listDocuments: () => fetch('/api/documents').then((r) => json<Doc[]>(r)),
  getDocument: (id: string) => fetch(`/api/documents/${id}`).then((r) => json<DocDetail>(r)),
  createDocument: (body: { title: string; tier: Doc['tier']; parties: { name: string; email: string }[] }) =>
    fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => json<Doc>(r)),
  sign: (id: string, partyId: string) =>
    fetch(`/api/documents/${id}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partyId }),
    }).then((r) => json<Doc>(r)),
  dispatch: (id: string) => fetch(`/api/documents/${id}/dispatch`, { method: 'POST' }).then((r) => json<Doc>(r)),
  deliver: (id: string) => fetch(`/api/documents/${id}/deliver`, { method: 'POST' }).then((r) => json<Doc>(r)),
  verify: (code: string) => fetch(`/api/verify/${code}`).then((r) => json<VerifyRecord>(r)),
};

export const EVENT_LABELS: Record<string, string> = {
  CREATED: 'Document created',
  PARTY_INVITED: 'Party invited',
  SIGNED: 'Signed',
  ALL_SIGNED: 'All parties signed',
  PRINT_DISPATCHED: 'Dispatched to ISO 14298 print site',
  PRINT_ATTESTED: 'Print attested by operator',
  POSTED: 'Posted — registered mail',
  DELIVERED: 'Delivered — signature on receipt',
};
