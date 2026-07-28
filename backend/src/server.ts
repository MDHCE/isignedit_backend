import Fastify from 'fastify';
import cors from '@fastify/cors';
import { randomUUID } from 'node:crypto';
import * as store from './store.js';
import type { Party, SignedDocument, SignatureTier } from './types.js';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get('/healthz', async () => ({ ok: true, service: 'isigned-backend' }));

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
    code: store.newCode(),
    title,
    tier,
    status: 'awaiting_signatures',
    parties: parties.map((p) => ({ id: randomUUID(), ...p, signedAt: null })),
    createdAt: new Date().toISOString(),
  };
  store.saveDocument(doc);
  store.appendEvent(doc.id, 'CREATED', 'initiator', { title, tier });
  for (const p of doc.parties) {
    store.appendEvent(doc.id, 'PARTY_INVITED', 'platform', { party: p.name, email: p.email });
  }
  return reply.code(201).send(doc);
});

app.get('/api/documents', async () => store.allDocuments());

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
    store.appendEvent(doc.id, 'SIGNED', party.name, { tier: doc.tier });

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
  const doc = store.findDocument(req.params.id);
  if (!doc) return reply.code(404).send({ error: 'not found' });
  if (doc.status !== 'signed') {
    return reply.code(409).send({ error: 'document must be fully signed first' });
  }
  doc.status = 'dispatched';
  store.appendEvent(doc.id, 'PRINT_DISPATCHED', 'platform', { site: 'ISO14298-pilot-1' });
  store.appendEvent(doc.id, 'PRINT_ATTESTED', 'print-station-01', { operator: 'op-demo' });
  store.appendEvent(doc.id, 'POSTED', 'carrier', { service: 'registered' });
  store.saveDocument(doc);
  return doc;
});

app.post<{ Params: { id: string } }>('/api/documents/:id/deliver', async (req, reply) => {
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
  app.log.info({ code: doc.code }, 'seeded demo document');
}

const port = Number(process.env.PORT ?? 4820);
await app.listen({ port, host: '0.0.0.0' });
