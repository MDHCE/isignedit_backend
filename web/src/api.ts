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
  trackingNumber: string | null;
  createdAt: string;
}

export interface Batch {
  id: string;
  name: string;
  recipient: { name: string; email: string; address: string };
  cadence: 'weekly' | 'monthly';
  nextSendAt: string;
  documentIds: string[];
  shipments: { at: string; trackingNumber: string; documentIds: string[] }[];
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

import { accessToken } from './auth';

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await accessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.json().catch(() => ({})) as { error?: string }).error ?? res.statusText);
  return res.json() as Promise<T>;
}

export const api = {
  listDocuments: () => authedFetch('/api/documents').then((r) => json<Doc[]>(r)),
  getDocument: (id: string) => authedFetch(`/api/documents/${id}`).then((r) => json<DocDetail>(r)),
  createDocument: (body: { title: string; tier: Doc['tier']; parties: { name: string; email: string }[] }) =>
    authedFetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => json<Doc>(r)),
  sign: (id: string, partyId: string) =>
    authedFetch(`/api/documents/${id}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partyId }),
    }).then((r) => json<Doc>(r)),
  dispatch: (id: string) => authedFetch(`/api/documents/${id}/dispatch`, { method: 'POST' }).then((r) => json<Doc>(r)),
  deliver: (id: string) => authedFetch(`/api/documents/${id}/deliver`, { method: 'POST' }).then((r) => json<Doc>(r)),
  verify: (code: string) => fetch(`/api/verify/${code}`).then((r) => json<VerifyRecord>(r)),
  track: (id: string) =>
    authedFetch(`/api/documents/${id}/tracking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).then((r) => json<DocDetail>(r)),
  listBatches: () => authedFetch('/api/batches').then((r) => json<Batch[]>(r)),
  createBatch: (body: { name: string; cadence: Batch['cadence']; recipient: Batch['recipient'] }) =>
    authedFetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => json<Batch>(r)),
  addToBatch: (batchId: string, documentId: string) =>
    authedFetch(`/api/batches/${batchId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
    }).then((r) => json<Batch>(r)),
  dispatchBatch: (batchId: string) =>
    authedFetch(`/api/batches/${batchId}/dispatch`, { method: 'POST' }).then((r) => json<Batch>(r)),
  usage: () => authedFetch('/api/billing/usage').then((r) => json<PpsUsage>(r)),
};

export interface PpsUsage {
  count: number;
  totalCents: number;
  currency: 'eur';
  byTier: Record<string, { count: number; cents: number }>;
  charges: {
    id: string;
    documentCode: string;
    tier: string;
    signerName: string;
    amountCents: number;
    at: string;
    stripeStatus: string;
  }[];
}

export const EVENT_LABELS: Record<string, string> = {
  CREATED: 'Document created',
  PARTY_INVITED: 'Party invited',
  SIGNED: 'Signed',
  ALL_SIGNED: 'All parties signed',
  PRINT_DISPATCHED: 'Dispatched to ISO 14298 print site',
  PRINT_ATTESTED: 'Print attested by operator',
  POSTED: 'Posted — registered mail',
  TRACKING_UPDATE: 'Carrier tracking update',
  DELIVERED: 'Delivered — signature on receipt',
  BATCH_ADDED: 'Added to delivery batch',
  BATCH_DISPATCHED: 'Sent in batched certified envelope',
};
