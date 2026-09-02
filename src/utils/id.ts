/**
 * Unique identifier. Uses `crypto.randomUUID` when available, falling back for
 * older browsers and insecure (plain http) contexts where it is undefined.
 */
export function createId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random}`;
}
