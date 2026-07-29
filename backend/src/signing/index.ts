import { DevSigningProvider } from './dev.js';
import { SecurosysCloudHsmProvider } from './securosys.js';
import type { SigningProvider } from './provider.js';

/** HSM_PROVIDER=dev (default) | securosys — the whole swap, per Architecture §3.2. */
export function createSigningProvider(): SigningProvider {
  switch ((process.env.HSM_PROVIDER ?? 'dev').toLowerCase()) {
    case 'securosys':
      return new SecurosysCloudHsmProvider();
    default:
      return new DevSigningProvider();
  }
}

export type { SignatureResult, SigningProvider } from './provider.js';
