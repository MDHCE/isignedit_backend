/**
 * Solution-wide journal: append-only, hash-chained NDJSON of every mutating
 * API action (who, as what role, did what, to which entity, with what result).
 *
 * Purpose: traceability across the whole platform (not just per-document
 * evidence chains) and recovery — mutations carry enough context to audit or
 * replay state. One line per entry; corruption of one line is detectable via
 * the chain, and the file tail can be truncated to the last valid entry.
 */
import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const JOURNAL_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'journal.ndjson');

export interface JournalEntry {
  id: string;
  at: string;
  actor: string;
  roles: string[];
  action: string;          // e.g. "POST /api/documents/:id/sign"
  entity?: string;         // document/batch id when known
  status: number;
  detail?: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

const GENESIS = '0'.repeat(64);
let lastHash = GENESIS;
let loaded = false;

function canonical(e: Omit<JournalEntry, 'hash'>): string {
  return JSON.stringify([e.id, e.at, e.actor, e.roles, e.action, e.entity, e.status, e.detail, e.prevHash]);
}

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  if (existsSync(JOURNAL_FILE)) {
    const lines = readFileSync(JOURNAL_FILE, 'utf8').trim().split('\n').filter(Boolean);
    if (lines.length) {
      try {
        lastHash = (JSON.parse(lines[lines.length - 1]) as JournalEntry).hash;
      } catch {
        /* tail corruption: verify() will report it */
      }
    }
  }
}

export function journal(
  entry: Omit<JournalEntry, 'id' | 'at' | 'prevHash' | 'hash'>,
): JournalEntry {
  ensureLoaded();
  const partial = {
    id: randomUUID(),
    at: new Date().toISOString(),
    ...entry,
    prevHash: lastHash,
  };
  const full: JournalEntry = {
    ...partial,
    hash: createHash('sha256').update(canonical(partial)).digest('hex'),
  };
  mkdirSync(dirname(JOURNAL_FILE), { recursive: true });
  appendFileSync(JOURNAL_FILE, JSON.stringify(full) + '\n');
  lastHash = full.hash;
  return full;
}

export function readJournal(limit = 100): JournalEntry[] {
  if (!existsSync(JOURNAL_FILE)) return [];
  const lines = readFileSync(JOURNAL_FILE, 'utf8').trim().split('\n').filter(Boolean);
  return lines.slice(-limit).map((l) => JSON.parse(l) as JournalEntry);
}

/** Recompute the whole chain; returns index of first bad entry or -1. */
export function verifyJournal(): { valid: boolean; entries: number; firstInvalid: number } {
  if (!existsSync(JOURNAL_FILE)) return { valid: true, entries: 0, firstInvalid: -1 };
  const lines = readFileSync(JOURNAL_FILE, 'utf8').trim().split('\n').filter(Boolean);
  let prev = GENESIS;
  for (let i = 0; i < lines.length; i++) {
    let e: JournalEntry;
    try {
      e = JSON.parse(lines[i]) as JournalEntry;
    } catch {
      return { valid: false, entries: lines.length, firstInvalid: i };
    }
    const { hash, ...rest } = e;
    if (e.prevHash !== prev || createHash('sha256').update(canonical(rest)).digest('hex') !== hash) {
      return { valid: false, entries: lines.length, firstInvalid: i };
    }
    prev = hash;
  }
  return { valid: true, entries: lines.length, firstInvalid: -1 };
}
