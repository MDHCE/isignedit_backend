import Fastify from 'fastify';
import cors from '@fastify/cors';
import { randomUUID } from 'node:crypto';
import * as store from './store.js';
import { DEV_USER, authEnabled, authenticate } from './auth.js';
import { devRoles, requireRole } from './roles.js';
import { journal, readJournal, verifyJournal } from './journal.js';
import { chargesFor, recordSignatureCharge, toStripeInvoiceItem, usageSummary, PPS_PRICES } from './billing.js';
import { createSigningProvider } from './signing/index.js';
import { createHash } from 'node:crypto';
import type { BatchCadence, DeliveryBatch, Party, SignedDocument, SignatureTier } from './types.js';

const signingProvider = createSigningProvider();

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

// ---------- authentication (Zitadel OIDC; dev mode without ZITADEL_ISSUER) ----------
app.decorateRequest('user');
app.addHook('preHandler', async (req, reply) => {
  req.user = { ...DEV_USER, roles: devRoles(req.headers['x-dev-role'] as string | undefined) };
  if (!req.url.startsWith('/api/') || req.url.startsWith('/api/verify/') || req.url === '/api/config') {
    return; // public surface
  }
  const user = await authenticate(req.headers.authorization);
  if (!user) return reply.code(401).send({ error: 'authentication required' });
  req.user = authEnabled ? user : { ...user, roles: devRoles(req.headers['x-dev-role'] as string | undefined) };
});

// Solution-wide journal: every mutating API call, hash-chained (traceability & recovery).
app.addHook('onResponse', async (req, reply) => {
  if (req.method === 'GET' || req.method === 'OPTIONS' || !req.url.startsWith('/api/')) return;
  const entityMatch = req.url.match(/\/api\/(?:documents|batches)\/([0-9a-f-]{36})/);
  journal({
    actor: req.user?.id ?? 'anonymous',
    roles: req.user?.roles ?? [],
    action: `${req.method} ${req.url}`,
    entity: entityMatch?.[1],
    status: reply.statusCode,
    detail: typeof req.body === 'object' && req.body ? summarise(req.body as Record<string, unknown>) : undefined,
  });
});

/** Journal payload summary — keys + scalar values, no deep document content. */
function summarise(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    out[k] = typeof v === 'object' && v !== null ? `[${Array.isArray(v) ? v.length + ' items' : 'object'}]` : v;
  }
  return out;
}

app.get('/healthz', async () => ({ ok: true, service: 'isigned-backend' }));
app.get('/api/config', async () => ({ authEnabled, signingProvider: signingProvider.name, ppsPrices: PPS_PRICES }));
app.get('/api/me', async (req) => ({ user: req.user, authEnabled }));

// ---------- documents ----------

interface CreateBody {
  title: string;
  tier?: SignatureTier;
  parties: { name: string; email: string }[];
}

app.post<{ Body: CreateBody }>('/api/documents', async (req, reply) => {
  const { title, tier = 'SES', parties } = req.body ?? ({} as CreateBody);
  if (!title || !parties?.length) {
    return reply.code(400).send({ error: 'title and at least one party are required' });
  }
  const doc: SignedDocument = {
    id: randomUUID(),
    ownerId: req.user.id,
    code: store.newCode(),
    title,
    tier,
    status: 'awaiting_signatures',
    parties: parties.map((p) => ({ id: randomUUID(), ...p, signedAt: null })),
    trackingNumber: null,
    createdAt: new Date().toISOString(),
  };
  store.saveDocument(doc);
  store.appendEvent(doc.id, 'CREATED', 'initiator', { title, tier });
  for (const p of doc.parties) {
    store.appendEvent(doc.id, 'PARTY_INVITED', 'platform', { party: p.name, email: p.email });
  }
  return reply.code(201).send(doc);
});

app.get('/api/documents', async (req) => store.allDocuments(req.user.id));

app.get<{ Params: { id: string } }>('/api/documents/:id', async (req, reply) => {
  const doc = store.findDocument(req.params.id);
  if (!doc) return reply.code(404).send({ error: 'not found' });
  return { ...doc, events: store.eventsFor(doc.id), chainValid: store.chainValid(doc.id) };
});

// ---------- signing ----------

app.post<{ Params: { id: string }; Body: { partyId: string } }>(
  '/api/documents/:id/sign',
  async (req, reply) => {
    const doc = store.findDocument(req.params.id);
    if (!doc) return reply.code(404).send({ error: 'not found' });
    const party: Party | undefined = doc.parties.find((p) => p.id === req.body?.partyId);
    if (!party) return reply.code(400).send({ error: 'unknown party' });
    if (party.signedAt) return reply.code(409).send({ error: 'already signed' });

    party.signedAt = new Date().toISOString();
    const digestHex = createHash('sha256')
      .update(`${doc.id}:${doc.title}:${party.id}:${party.signedAt}`)
      .digest('hex');
    const sig = await signingProvider.sign({ digestHex, signerId: party.id, documentId: doc.id });
    const charge = recordSignatureCharge({
      ownerId: doc.ownerId,
      documentId: doc.id,
      documentCode: doc.code,
      tier: doc.tier,
      signerName: party.name,
    });
    store.appendEvent(doc.id, 'SIGNED', party.name, {
      tier: doc.tier,
      digest: digestHex,
      signature: { provider: sig.provider, keyId: sig.keyId, algorithm: sig.algorithm, value: sig.signature },
      ppsChargeId: charge.id,
    });

    if (doc.parties.every((p) => p.signedAt)) {
      doc.status = 'signed';
      store.appendEvent(doc.id, 'ALL_SIGNED', 'platform', { parties: doc.parties.length });
    }
    store.saveDocument(doc);
    return doc;
  },
);

// ---------- fulfilment (dev stub of the Print Station flow) ----------

app.post<{ Params: { id: string } }>('/api/documents/:id/dispatch', async (req, reply) => {
  if (!requireRole(req, reply, 'printer')) return;
  const doc = store.findDocument(req.params.id);
  if (!doc) return reply.code(404).send({ error: 'not found' });
  if (doc.status !== 'signed') {
    return reply.code(409).send({ error: 'document must be fully signed first' });
  }
  doc.status = 'dispatched';
  doc.trackingNumber = store.newTrackingNumber();
  store.appendEvent(doc.id, 'PRINT_DISPATCHED', 'platform', { site: 'ISO14298-pilot-1' });
  store.appendEvent(doc.id, 'PRINT_ATTESTED', 'print-station-01', { operator: 'op-demo' });
  store.appendEvent(doc.id, 'POSTED', 'carrier', {
    service: 'registered',
    trackingNumber: doc.trackingNumber,
  });
  store.appendEvent(doc.id, 'TRACKING_UPDATE', 'carrier', {
    trackingNumber: doc.trackingNumber,
    status: 'accepted by carrier',
    location: 'Milano sorting centre',
  });
  store.saveDocument(doc);
  return doc;
});

// Carrier scans land in the evidence history (webhook stand-in for dev).
app.post<{ Params: { id: string }; Body: { status?: string; location?: string } }>(
  '/api/documents/:id/tracking',
  async (req, reply) => {
    if (!requireRole(req, reply, 'logistics')) return;
    const doc = store.findDocument(req.params.id);
    if (!doc) return reply.code(404).send({ error: 'not found' });
    if (!doc.trackingNumber) return reply.code(409).send({ error: 'not posted yet' });
    store.appendEvent(doc.id, 'TRACKING_UPDATE', 'carrier', {
      trackingNumber: doc.trackingNumber,
      status: req.body?.status ?? 'in transit',
      location: req.body?.location ?? 'en route',
    });
    return { ...doc, events: store.eventsFor(doc.id) };
  },
);

app.post<{ Params: { id: string } }>('/api/documents/:id/deliver', async (req, reply) => {
  if (!requireRole(req, reply, 'logistics')) return;
  const doc = store.findDocument(req.params.id);
  if (!doc) return reply.code(404).send({ error: 'not found' });
  if (doc.status !== 'dispatched') {
    return reply.code(409).send({ error: 'document is not in delivery' });
  }
  doc.status = 'delivered';
  store.appendEvent(doc.id, 'DELIVERED', 'carrier', { proof: 'signature-on-receipt' });
  store.saveDocument(doc);
  return doc;
});

// ---------- public verification (the isigned.it/v/<code> record) ----------

app.get<{ Params: { code: string } }>('/api/verify/:code', async (req, reply) => {
  const doc = store.findByCode(req.params.code);
  if (!doc) return reply.code(404).send({ error: 'unknown verification code' });
  // Public page: metadata + proof chain, never document content.
  return {
    code: doc.code,
    tier: doc.tier,
    status: doc.status,
    parties: doc.parties.map((p) => ({ name: p.name, signed: !!p.signedAt })),
    events: store.eventsFor(doc.id).map(({ documentId, ...e }) => e),
    chainValid: store.chainValid(doc.id),
  };
});

// ---------- delivery batches (recurring certified sends) ----------

function advance(cadence: BatchCadence, from: Date): string {
  const d = new Date(from);
  d.setDate(d.getDate() + (cadence === 'weekly' ? 7 : 30));
  return d.toISOString();
}

interface BatchBody {
  name: string;
  recipient: { name: string; email: string; address: string };
  cadence: BatchCadence;
}

app.get('/api/batches', async (req) => store.allBatches(req.user.id));

app.post<{ Body: BatchBody }>('/api/batches', async (req, reply) => {
  const { name, recipient, cadence = 'weekly' } = req.body ?? ({} as BatchBody);
  if (!name || !recipient?.name || !recipient?.address) {
    return reply.code(400).send({ error: 'name, recipient.name and recipient.address are required' });
  }
  const batch: DeliveryBatch = {
    id: randomUUID(),
    ownerId: req.user.id,
    name,
    recipient,
    cadence,
    nextSendAt: advance(cadence, new Date()),
    documentIds: [],
    shipments: [],
    createdAt: new Date().toISOString(),
  };
  store.saveBatch(batch);
  return reply.code(201).send(batch);
});

app.post<{ Params: { id: string }; Body: { documentId: string } }>(
  '/api/batches/:id/documents',
  async (req, reply) => {
    const batch = store.findBatch(req.params.id);
    if (!batch) return reply.code(404).send({ error: 'batch not found' });
    const doc = store.findDocument(req.body?.documentId);
    if (!doc) return reply.code(400).send({ error: 'unknown document' });
    if (batch.documentIds.includes(doc.id)) return reply.code(409).send({ error: 'already in batch' });
    batch.documentIds.push(doc.id);
    store.saveBatch(batch);
    store.appendEvent(doc.id, 'BATCH_ADDED', 'initiator', {
      batch: batch.name,
      recipient: batch.recipient.name,
      cycleSendsAt: batch.nextSendAt,
    });
    return batch;
  },
);

app.post<{ Params: { id: string } }>('/api/batches/:id/dispatch', async (req, reply) => {
  const batch = store.findBatch(req.params.id);
  if (!batch) return reply.code(404).send({ error: 'batch not found' });
  if (!batch.documentIds.length) return reply.code(409).send({ error: 'batch cycle is empty' });

  const trackingNumber = store.newTrackingNumber();
  for (const docId of batch.documentIds) {
    store.appendEvent(docId, 'BATCH_DISPATCHED', 'platform', {
      batch: batch.name,
      recipient: batch.recipient.name,
      trackingNumber,
      documents: batch.documentIds.length,
    });
  }
  batch.shipments.push({
    at: new Date().toISOString(),
    trackingNumber,
    documentIds: [...batch.documentIds],
  });
  batch.documentIds = [];
  batch.nextSendAt = advance(batch.cadence, new Date());
  store.saveBatch(batch);
  return batch;
});

// ---------- attorney ----------

app.post<{ Params: { id: string }; Body: { opinion?: string } }>(
  '/api/documents/:id/validate',
  async (req, reply) => {
    if (!requireRole(req, reply, 'attorney')) return;
    const doc = store.findDocument(req.params.id);
    if (!doc) return reply.code(404).send({ error: 'not found' });
    store.appendEvent(doc.id, 'ATTORNEY_VALIDATED', req.user.name ?? req.user.id, {
      opinion: req.body?.opinion ?? 'reviewed',
    });
    return { ...doc, events: store.eventsFor(doc.id) };
  },
);

// ---------- billing (PPS — Pay Per Sign, Stripe-shaped) ----------

app.get('/api/billing/usage', async (req) => usageSummary(req.user.id));

app.get('/api/admin/billing', async (req, reply) => {
  if (!requireRole(req, reply, 'administrator')) return;
  return {
    ...usageSummary(),
    stripeInvoiceItems: chargesFor()
      .filter((c) => c.stripeStatus === 'pending_invoice')
      .map(toStripeInvoiceItem),
  };
});

// ---------- admin: solution-wide journal ----------

app.get<{ Querystring: { limit?: string } }>('/api/admin/journal', async (req, reply) => {
  if (!requireRole(req, reply, 'administrator')) return;
  return { integrity: verifyJournal(), entries: readJournal(Number(req.query.limit ?? 100)) };
});

// ---------- boot ----------

store.load();

// Seed a demo document on an empty store so every UI has something to show.
if (store.allDocuments().length === 0) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/documents',
    payload: {
      title: 'Office lease agreement — Via Roma 12, Milano',
      tier: 'QES',
      parties: [
        { name: 'Daniel Martonicz', email: 'daniel@isigned.it' },
        { name: 'Giulia Bianchi', email: 'giulia@example.it' },
      ],
    },
  });
  const doc = res.json() as SignedDocument;
  for (const p of doc.parties) {
    await app.inject({ method: 'POST', url: `/api/documents/${doc.id}/sign`, payload: { partyId: p.id } });
  }
  await app.inject({ method: 'POST', url: `/api/documents/${doc.id}/dispatch` });
  await app.inject({
    method: 'POST',
    url: `/api/documents/${doc.id}/tracking`,
    payload: { status: 'in transit', location: 'Bologna hub' },
  });
  const bres = await app.inject({
    method: 'POST',
    url: '/api/batches',
    payload: {
      name: 'Weekly to accountant',
      recipient: {
        name: 'Studio Rossi Commercialisti',
        email: 'studio@rossi.it',
        address: 'Corso Buenos Aires 45, 20124 Milano',
      },
      cadence: 'weekly',
    },
  });
  const batch = bres.json() as DeliveryBatch;
  await app.inject({
    method: 'POST',
    url: `/api/batches/${batch.id}/documents`,
    payload: { documentId: doc.id },
  });
  app.log.info({ code: doc.code, batch: batch.name }, 'seeded demo document + batch');
}

const port = Number(process.env.PORT ?? 4820);
await app.listen({ port, host: '0.0.0.0' });
