import type { PixelTexture } from './item-renderer-engine';

const MAX_ENTRIES = 64;
const MAX_RETAINED_BYTES = 32 * 1024 * 1024;
interface Entry { promise: Promise<PixelTexture>; retainedBytes: number }

/** Private resident cache. Eviction releases only this cache's ownership;
 * callers and outstanding requests continue independently. */
export function createTexturePromiseCache(load: (url: string) => Promise<PixelTexture>): (url: string) => Promise<PixelTexture> {
  const entries = new Map<string, Entry>();
  let retainedBytes = 0;
  const remove = (url: string, entry: Entry) => {
    if (entries.get(url) !== entry) return;
    entries.delete(url);
    retainedBytes -= entry.retainedBytes;
  };
  const trim = () => {
    while (entries.size > MAX_ENTRIES || retainedBytes > MAX_RETAINED_BYTES) {
      const oldest = entries.entries().next();
      if (oldest.done) break;
      remove(oldest.value[0], oldest.value[1]);
    }
  };
  return url => {
    const cached = entries.get(url);
    if (cached) {
      entries.delete(url); entries.set(url, cached);
      return cached.promise;
    }
    // Populate before invoking the loader, including synchronous failures.
    const entry: Entry = { promise: Promise.resolve().then(() => load(url)), retainedBytes: 0 };
    entry.promise = entry.promise.then(texture => {
      if (entries.get(url) === entry) {
        // Count the entire retained backing store, including any unused view
        // bytes. Shared backing stores may be conservatively counted twice.
        const bytes = texture.data.buffer.byteLength;
        if (bytes > MAX_RETAINED_BYTES) remove(url, entry);
        else { entry.retainedBytes = bytes; retainedBytes += bytes; trim(); }
      }
      return texture;
    }, error => {
      remove(url, entry);
      throw error;
    });
    entries.set(url, entry); trim();
    return entry.promise;
  };
}
