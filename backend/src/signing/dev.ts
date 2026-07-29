/**
 * Dev signing provider — real Ed25519 signatures with a locally persisted
 * keypair. NOT for production (keys on disk, no QSCD): its job is to make the
 * signature data path real so the Securosys swap changes nothing upstream.
 */
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SignatureResult, SigningProvider } from './provider.js';

const KEY_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'dev-signing-key.json');

function loadOrCreateKeys(): { privatePem: string; publicPem: string; keyId: string } {
  if (existsSync(KEY_FILE)) {
    return JSON.parse(readFileSync(KEY_FILE, 'utf8')) as ReturnType<typeof loadOrCreateKeys>;
  }
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const stored = {
    privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    keyId: `dev-ed25519-${Date.now().toString(36)}`,
  };
  mkdirSync(dirname(KEY_FILE), { recursive: true });
  writeFileSync(KEY_FILE, JSON.stringify(stored, null, 2));
  return stored;
}

export class DevSigningProvider implements SigningProvider {
  readonly name = 'dev-ed25519';
  private keys = loadOrCreateKeys();

  async sign(input: { digestHex: string; signerId: string; documentId: string }): Promise<SignatureResult> {
    const payload = Buffer.from(`${input.documentId}:${input.signerId}:${input.digestHex}`);
    const signature = sign(null, payload, createPrivateKey(this.keys.privatePem));
    return {
      provider: this.name,
      keyId: this.keys.keyId,
      algorithm: 'Ed25519',
      signature: signature.toString('base64'),
      publicKey: Buffer.from(this.keys.publicPem).toString('base64'),
      signedAt: new Date().toISOString(),
    };
  }

  async verify(input: { digestHex: string; signature: string; publicKey: string }): Promise<boolean> {
    try {
      const pem = Buffer.from(input.publicKey, 'base64').toString();
      return verify(
        null,
        Buffer.from(input.digestHex),
        createPublicKey(pem),
        Buffer.from(input.signature, 'base64'),
      );
    } catch {
      return false;
    }
  }

  async status() {
    return { ok: true, detail: `dev Ed25519 keypair ${this.keys.keyId} (NOT for production)` };
  }
}
