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
  /** public verification code, printed as QR on every copy */
  code: string;
  title: string;
  tier: SignatureTier;
  status: DocumentStatus;
  parties: Party[];
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
  | 'DELIVERED';

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
