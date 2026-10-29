import { renderBitmapGlyphs } from './bitmap-text-webgl';
import type { BitmapGlyphRenderOptions } from './bitmap-text-webgl';

type SharedDrawOptions = Omit<BitmapGlyphRenderOptions, 'canvas' | 'output'>;
interface Subscriber {
  onError: (error: Error) => void;
  released: boolean;
  notified: boolean;
}
interface Session {
  owner: Document;
  canvas: OffscreenCanvas;
  context: WebGLRenderingContext;
  subscribers: Set<Subscriber>;
  lost: boolean;
  disposeGpu?: () => void;
  contextLost: (event: Event) => void;
}

const sessions = new WeakMap<Document, Session>();

function destroy(session: Session): void {
  session.canvas.removeEventListener('webglcontextlost', session.contextLost);
  if (sessions.get(session.owner) === session) sessions.delete(session.owner);
  session.disposeGpu?.();
  session.disposeGpu = undefined;
}

function invalidate(session: Session): void {
  if (session.lost) return;
  session.lost = true;
  destroy(session);
  for (const subscriber of session.subscribers) {
    if (subscriber.released || subscriber.notified) continue;
    subscriber.notified = true;
    // One failed owner callback must not suppress notification of other owners.
    try { subscriber.onError(new Error('The shared bitmap WebGL context was lost.')); }
    catch { /* The component owns its callback error; remaining owners still receive loss. */ }
  }
}

function getSession(owner: Document): Session {
  const existing = sessions.get(owner);
  if (existing && !existing.lost) return existing;
  const Constructor = owner.defaultView?.OffscreenCanvas;
  if (typeof Constructor !== 'function') throw new Error('Shared bitmap rendering requires OffscreenCanvas.');
  const canvas = new Constructor(1, 1);
  if (typeof canvas.transferToImageBitmap !== 'function') throw new Error('Shared bitmap rendering requires transferToImageBitmap.');
  const context = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true });
  if (!context || context.isContextLost()) throw new Error('Shared bitmap WebGL rendering is unavailable.');
  const session: Session = {
    owner, canvas, context, subscribers: new Set(), lost: false,
    disposeGpu: () => { context.getExtension('WEBGL_lose_context')?.loseContext(); },
    contextLost: event => { event.preventDefault(); invalidate(session); },
  };
  canvas.addEventListener('webglcontextlost', session.contextLost);
  sessions.set(owner, session);
  return session;
}

/** Internal mounted-owner lease; deliberately absent from the package public entry. */
export interface SharedBitmapLease {
  render: (options: SharedDrawOptions, isCurrent?: () => boolean) => boolean;
  release: () => void;
}

/**
 * One exclusive Offscreen WebGL session per Document; each owner presents through
 * bitmaprenderer. ImageBitmap transfer is GPU presentation, never a straight-alpha
 * Canvas2D roundtrip. A lost session fails owners; subsequent acquisition is fresh.
 */
export function acquireSharedBitmapRenderer(target: HTMLCanvasElement, onError: (error: Error) => void): SharedBitmapLease {
  const presenter = target.getContext('bitmaprenderer', { alpha: true });
  if (!presenter) throw new Error('Shared bitmap rendering requires ImageBitmapRenderingContext.');
  const session = getSession(target.ownerDocument);
  const subscriber: Subscriber = { onError, released: false, notified: false };
  session.subscribers.add(subscriber);
  return {
    render(options, isCurrent = () => true) {
      if (subscriber.released) throw new Error('The shared bitmap rendering lease was released.');
      if (session.lost) throw new Error('The shared bitmap WebGL context was lost.');
      if (!isCurrent()) return false;
      if (!options.width || !options.height) {
        // Let the production validator check empty targets too, without resizing
        // or losing the session used by other owners.
        renderBitmapGlyphs(options);
        if (!isCurrent()) return false;
        target.width = options.width; target.height = options.height;
        return true;
      }
      let bitmap: ImageBitmap | undefined;
      let consumed = false;
      try {
        const rendered = renderBitmapGlyphs({ ...options, canvas: session.canvas });
        session.disposeGpu = rendered.dispose;
        if (!isCurrent()) return false;
        bitmap = session.canvas.transferToImageBitmap();
        if (!isCurrent()) return false;
        target.width = options.width; target.height = options.height;
        presenter.transferFromImageBitmap(bitmap);
        consumed = true;
        return true;
      } finally {
        if (bitmap && !consumed) bitmap.close();
        if (session.context.isContextLost()) invalidate(session);
      }
    },
    release() {
      if (subscriber.released) return;
      subscriber.released = true;
      session.subscribers.delete(subscriber);
      target.width = 0; target.height = 0;
      // Immediate StrictMode cleanup/setup can reacquire the same session.
      queueMicrotask(() => {
        if (!session.subscribers.size) destroy(session);
      });
    },
  };
}
