/** Internal Web edit identity, independent of opaque host revisions and run keys.
 * Web Crypto nonces avoid a shared counter that a host value could exhaust.
 * These are probabilistic identities, not authentication or ordering tokens. */
export function createChatRevision(avoid: readonly (string | undefined)[] = []): string {
  const provider = globalThis.crypto;
  if (!provider || typeof provider.getRandomValues !== 'function') {
    throw new Error('Chat Web revisions require crypto.getRandomValues');
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    const bytes = provider.getRandomValues(new Uint8Array(16));
    const token = 'mcchat:web:' + Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    if (!avoid.includes(token)) return token;
  }
  throw new Error('Chat Web revision entropy provider repeatedly returned an active token');
}
