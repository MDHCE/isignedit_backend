/**
 * Dev store: JSON file persistence behind a small repository API.
 * Swap for PostgreSQL in Stage 1 proper — the evidence-chain logic is
 * storage-agnostic and moves as-is.
 */
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EvidenceEvent, EventType, SignedDocument } from './types.js';

const DATA_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'store.json');

interface Db {
  documents: SignedDocument[];
  events: EvidenceEvent[];
}

let db: Db = { documents: [], events: [] };

export function load(): void {
  if (existsSync(DATA_FILE)) {
    db = JSON.parse(readFileSync(DATA_FILE, 'utf8')) as Db;
  }
}

function persist(): void {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

/** Stable serialisation so the hash is reproducible on verify. */
function canonical(e: Omit<EvidenceEvent, 'hash'>): string {
  return JSON.stringify([e.id, e.documentId, e.type, e.actor, e.at, e.data, e.prevHash]);
}

const GENESIS = '0'.repeat(64);

export function appendEvent(
  documentId: string,
  type: EventType,
  actor: string,
  data: Record<string, unknown> = {},
): EvidenceEvent {
  const chain = db.events.filter((e) => e.documentId === documentId);
  const prevHash = chain.length ? chain[chain.length - 1].hash : GENESIS;
  const partial = {
    id: randomUUID(),
    documentId,
    type,
    actor,
    at: new Date().toISOString(),
    data,
    prevHash,
  };
  const event: EvidenceEvent = {
    ...partial,
    hash: createHash('sha256').update(canonical(partial)).digest('hex'),
  };
  db.events.push(event);
  persist();
  return event;
}

/** Recompute the whole chain — verification shows proof, not assertions. */
export function chainValid(documentId: string): boolean {
  const chain = db.events.filter((e) => e.documentId === documentId);
  let prev = GENESIS;
  for (const e of chain) {
    if (e.prevHash !== prev) return false;
    const { hash, ...rest } = e;
    if (createHash('sha256').update(canonical(rest)).digest('hex') !== hash) return false;
    prev = hash;
  }
  return true;
}

export function eventsFor(documentId: string): EvidenceEvent[] {
  return db.events.filter((e) => e.documentId === documentId);
}

export function allDocuments(): SignedDocument[] {
  return [...db.documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function findDocument(id: string): SignedDocument | undefined {
  return db.documents.find((d) => d.id === id);
}

export function findByCode(code: string): SignedDocument | undefined {
  return db.documents.find((d) => d.code.toLowerCase() === code.toLowerCase());
}

export function saveDocument(doc: SignedDocument): void {
  const i = db.documents.findIndex((d) => d.id === doc.id);
  if (i >= 0) db.documents[i] = doc;
  else db.documents.push(doc);
  persist();
}

/** Verification codes look like 8F3K-29QT — unambiguous alphabet. */
export function newCode(): string {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const pick = (n: number) =>
    Array.from({ length: n }, () => abc[Math.floor(Math.random() * abc.length)]).join('');
  return `${pick(4)}-${pick(4)}`;
}
