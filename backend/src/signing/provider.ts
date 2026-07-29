/**
 * SigningProvider — the seam in front of the HSM.
 *
 * The platform never talks to key material directly; it asks a provider to
 * produce a signature over a digest. Swapping dev-crypto for Securosys
 * CloudHSM (or any QSCD) is a configuration change (HSM_PROVIDER env),
 * not a refactor — per IT Architecture §3.2.
 */
export interface SignatureResult {
  /** provider identifier, recorded in evidence */
  provider: string;
  /** key reference (dev key id / Securosys key name) — never the key itself */
  keyId: string;
  algorithm: string;         // e.g. 'Ed25519', 'RSASSA-PSS-SHA256'
  signature: string;         // base64
  /** base64 public key or certificate reference for verification */
  publicKey: string;
  signedAt: string;
}

export interface SigningProvider {
  readonly name: string;
  /** Sign a digest on behalf of a signer (SCAL2 authorisation happens upstream). */
  sign(input: { digestHex: string; signerId: string; documentId: string }): Promise<SignatureResult>;
  /** Verify a signature produced by this provider. */
  verify(input: { digestHex: string; signature: string; publicKey: string }): Promise<boolean>;
  /** Health/config check — used by /healthz detail. */
  status(): Promise<{ ok: boolean; detail: string }>;
}
