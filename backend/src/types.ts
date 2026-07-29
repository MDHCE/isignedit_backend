export type SignatureTier = 'SES' | 'AdES' | 'QES';

export type DocumentStatus =
  | 'awaiting_signatures'
  | 'signed'
  | 'dispatched'
  | 'delivered';

export interface Party {
  id: string;
  name: string;
  email: string;
  signedAt: string | null;
}

export interface SignedDocument {
  id: string;
  /** Zitadel subject (or 'dev-user' in dev mode) of the initiator */
  ownerId: string;
  /** public verification code, printed as QR on every copy */
  code: string;
  title: string;
  tier: SignatureTier;
  status: DocumentStatus;
  parties: Party[];
  /** carrier tracking number, set when the certified copy is posted */
  trackingNumber: string | null;
  createdAt: string;
}

export type EventType =
  | 'CREATED'
  | 'PARTY_INVITED'
  | 'SIGNED'
  | 'ALL_SIGNED'
  | 'PRINT_DISPATCHED'
  | 'PRINT_ATTESTED'
  | 'POSTED'
  | 'TRACKING_UPDATE'
  | 'DELIVERED'
  | 'BATCH_ADDED'
  | 'BATCH_DISPATCHED'
  | 'ATTORNEY_VALIDATED';

/** One link of the hash-chained evidence ledger (Architecture §3.1). */
export interface EvidenceEvent {
  id: string;
  documentId: string;
  type: EventType;
  actor: string;
  at: string;
  data: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

export type BatchCadence = 'weekly' | 'monthly';

export interface BatchShipment {
  at: string;
  trackingNumber: string;
  documentIds: string[];
}

/**
 * Recurring certified delivery to a standing recipient (e.g. weekly to the
 * accountant). Documents accumulate in the open cycle; dispatch posts them
 * as one certified envelope and starts the next cycle.
 */
export interface DeliveryBatch {
  id: string;
  ownerId: string;
  name: string;
  recipient: { name: string; email: string; address: string };
  cadence: BatchCadence;
  nextSendAt: string;
  documentIds: string[];
  shipments: BatchShipment[];
  createdAt: string;
}
