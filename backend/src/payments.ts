/**
 * Stripe payments for PPS charges — Apple Pay & Google Pay arrive through
 * Stripe's PaymentIntent + automatic payment methods (the payment sheet on
 * mobile, Payment Request API on web). No Stripe SDK: the REST API via fetch.
 *
 * Without STRIPE_SECRET_KEY the module runs in SIMULATED mode: intents succeed
 * instantly and charges are marked 'paid_dev' — the client flow is identical.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { chargesFor, markCharges } from './billing.js';

const SECRET = process.env.STRIPE_SECRET_KEY;
const PUBLISHABLE = process.env.STRIPE_PUBLISHABLE_KEY ?? '';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export const paymentsConfig = () => ({
  simulated: !SECRET,
  publishableKey: PUBLISHABLE,
  applePay: true,
  googlePay: true,
  currency: 'eur' as const,
});

export interface IntentResult {
  simulated: boolean;
  paymentIntentId: string;
  clientSecret: string | null;
  amountCents: number;
  currency: 'eur';
  chargeIds: string[];
  status: 'succeeded' | 'requires_payment_method';
}

/** Create a PaymentIntent covering all pending PPS charges of the owner. */
export async function createIntentForPending(ownerId: string): Promise<IntentResult | null> {
  const pending = chargesFor(ownerId).filter((c) => c.stripeStatus === 'pending_invoice');
  if (!pending.length) return null;
  const amount = pending.reduce((s, c) => s + c.amountCents, 0);
  const chargeIds = pending.map((c) => c.id);

  if (!SECRET) {
    // Simulated: Apple Pay / Google Pay sheet is skipped, charges settle instantly.
    const id = `pi_sim_${Date.now().toString(36)}`;
    markCharges(chargeIds, 'paid_dev', id);
    return {
      simulated: true,
      paymentIntentId: id,
      clientSecret: null,
      amountCents: amount,
      currency: 'eur',
      chargeIds,
      status: 'succeeded',
    };
  }

  const body = new URLSearchParams({
    amount: String(amount),
    currency: 'eur',
    'automatic_payment_methods[enabled]': 'true', // enables Apple Pay / Google Pay
    'metadata[pps_charge_ids]': chargeIds.join(','),
    'metadata[owner_id]': ownerId,
  });
  const res = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!res.ok) throw new Error(`stripe: ${res.status} ${await res.text()}`);
  const pi = (await res.json()) as { id: string; client_secret: string; status: string };
  markCharges(chargeIds, 'processing', pi.id);
  return {
    simulated: false,
    paymentIntentId: pi.id,
    clientSecret: pi.client_secret,
    amountCents: amount,
    currency: 'eur',
    chargeIds,
    status: 'requires_payment_method',
  };
}

/** Verify a Stripe webhook signature (v1 scheme) and settle charges on success. */
export function handleWebhook(rawBody: string, signatureHeader: string | undefined):
  | { ok: true; type: string }
  | { ok: false; error: string } {
  if (!WEBHOOK_SECRET) return { ok: false, error: 'webhook secret not configured' };
  if (!signatureHeader) return { ok: false, error: 'missing signature' };

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => p.split('=') as [string, string]),
  );
  const expected = createHmac('sha256', WEBHOOK_SECRET)
    .update(`${parts.t}.${rawBody}`)
    .digest('hex');
  const given = Buffer.from(parts.v1 ?? '', 'hex');
  const want = Buffer.from(expected, 'hex');
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return { ok: false, error: 'bad signature' };
  }

  const event = JSON.parse(rawBody) as {
    type: string;
    data: { object: { id: string; metadata?: { pps_charge_ids?: string } } };
  };
  if (event.type === 'payment_intent.succeeded') {
    const ids = event.data.object.metadata?.pps_charge_ids?.split(',') ?? [];
    if (ids.length) markCharges(ids, 'paid', event.data.object.id);
  }
  return { ok: true, type: event.type };
}
