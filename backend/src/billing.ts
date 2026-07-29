/**
 * PPS — Pay-Per-Sign usage tracking, shaped for Stripe invoicing.
 *
 * Every completed signature creates one PpsCharge. Charges accumulate as
 * "pending_invoice" until the (future) Stripe job turns them into invoice
 * items — `toStripeInvoiceItem()` is the exact payload shape for
 * `stripe.invoiceItems.create`. Prices are cents, configurable via env.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SignatureTier } from './types.js';

const CHARGES_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'charges.json');

export interface PpsCharge {
  id: string;
  ownerId: string;                 // future: mapped to a Stripe customer id
  documentId: string;
  documentCode: string;
  kind: 'signature';               // later: 'copy' | 'ai_draft' | 'validation' | 'video_session'
  tier: SignatureTier;
  signerName: string;
  amountCents: number;
  currency: 'eur';
  at: string;
  stripeStatus: 'pending_invoice' | 'invoiced' | 'processing' | 'paid' | 'paid_dev';
  stripeInvoiceItemId: string | null;
  paymentIntentId?: string | null;
  paidAt?: string | null;
}

/** Per-signature price by tier (cents). Override: PPS_PRICE_SES=150 etc. */
export const PPS_PRICES: Record<SignatureTier, number> = {
  SES: Number(process.env.PPS_PRICE_SES ?? 150),
  AdES: Number(process.env.PPS_PRICE_ADES ?? 450),
  QES: Number(process.env.PPS_PRICE_QES ?? 990),
};

let charges: PpsCharge[] = [];
let loaded = false;

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  if (existsSync(CHARGES_FILE)) charges = JSON.parse(readFileSync(CHARGES_FILE, 'utf8')) as PpsCharge[];
}

function persist(): void {
  mkdirSync(dirname(CHARGES_FILE), { recursive: true });
  writeFileSync(CHARGES_FILE, JSON.stringify(charges, null, 2));
}

export function recordSignatureCharge(input: {
  ownerId: string;
  documentId: string;
  documentCode: string;
  tier: SignatureTier;
  signerName: string;
}): PpsCharge {
  ensureLoaded();
  const charge: PpsCharge = {
    id: randomUUID(),
    ...input,
    kind: 'signature',
    amountCents: PPS_PRICES[input.tier],
    currency: 'eur',
    at: new Date().toISOString(),
    stripeStatus: 'pending_invoice',
    stripeInvoiceItemId: null,
  };
  charges.push(charge);
  persist();
  return charge;
}

export function chargesFor(ownerId?: string): PpsCharge[] {
  ensureLoaded();
  return charges
    .filter((c) => !ownerId || c.ownerId === ownerId)
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function usageSummary(ownerId?: string) {
  const list = chargesFor(ownerId);
  const totalCents = list.reduce((s, c) => s + c.amountCents, 0);
  const byTier = {} as Record<string, { count: number; cents: number }>;
  for (const c of list) {
    byTier[c.tier] ??= { count: 0, cents: 0 };
    byTier[c.tier].count++;
    byTier[c.tier].cents += c.amountCents;
  }
  return { charges: list, count: list.length, totalCents, byTier, currency: 'eur' as const };
}

export function markCharges(
  ids: string[],
  status: PpsCharge['stripeStatus'],
  paymentIntentId?: string,
): void {
  ensureLoaded();
  const now = new Date().toISOString();
  for (const c of charges) {
    if (ids.includes(c.id)) {
      c.stripeStatus = status;
      if (paymentIntentId) c.paymentIntentId = paymentIntentId;
      if (status === 'paid' || status === 'paid_dev') c.paidAt = now;
    }
  }
  persist();
}

/** Shape for stripe.invoiceItems.create — the future invoicing job maps 1:1. */
export function toStripeInvoiceItem(c: PpsCharge) {
  return {
    customer: c.ownerId, // replace with the Stripe customer id mapping
    amount: c.amountCents,
    currency: c.currency,
    description: `iSigned.it ${c.tier} signature — ${c.signerName} on ${c.documentCode}`,
    metadata: {
      pps_charge_id: c.id,
      document_id: c.documentId,
      document_code: c.documentCode,
      kind: c.kind,
      tier: c.tier,
    },
  };
}
