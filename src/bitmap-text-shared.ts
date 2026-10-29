import { createSharedBitmapGlyphRenderer, renderBitmapGlyphs } from './bitmap-text-webgl';
import type { BitmapGlyphRenderOptions } from './bitmap-text-webgl';
import { resizeSharedBitmapCanvas, SharedBitmapBudget } from './bitmap-text-shared-resources';

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
  destroyed: boolean;
  busy: boolean;
  accounting: object;
  renderer: ReturnType<typeof createSharedBitmapGlyphRenderer>;
  contextLost: (event: Event) => void;
}

const sessions = new WeakMap<Document, Session>();
const budget = new SharedBitmapBudget();

function destroy(session: Session): void {
  if (session.destroyed) return; session.destroyed = true;
  session.canvas.removeEventListener('webglcontextlost', session.contextLost);
  if (sessions.get(session.owner) === session) sessions.delete(session.owner);
  session.renderer.dispose(); budget.destroy(session.accounting);
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
  const accounting = {}; budget.open(accounting);
  let canvas: OffscreenCanvas | undefined;
  let context: WebGLRenderingContext | null = null;
  try {
    canvas = new Constructor(1, 1);
    if (typeof canvas.transferToImageBitmap !== 'function') throw new Error('Shared bitmap rendering requires transferToImageBitmap.');
    context = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true });
    if (!context || context.isContextLost()) throw new Error('Shared bitmap WebGL rendering is unavailable.');
    const session: Session = {
      owner, canvas, context, subscribers: new Set(), lost: false, destroyed: false, busy: false, accounting,
      renderer: createSharedBitmapGlyphRenderer(canvas, context),
      contextLost: event => { event.preventDefault(); invalidate(session); },
    };
    canvas.addEventListener('webglcontextlost', session.contextLost);
    sessions.set(owner, session);
    return session;
  } catch (error) {
    budget.destroy(accounting); if (canvas) resizeSharedBitmapCanvas(canvas, 1, 1);
    context?.getExtension('WEBGL_lose_context')?.loseContext(); throw error;
  }
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
  const subscriber: Subscriber = { onError, released: false, notified: false };
  budget.acquire(subscriber);
  let presenter: ImageBitmapRenderingContext | null, session: Session;
  try {
    presenter = target.getContext('bitmaprenderer', { alpha: true });
    if (!presenter) throw new Error('Shared bitmap rendering requires ImageBitmapRenderingContext.');
    session = getSession(target.ownerDocument);
  } catch (error) { budget.release(subscriber); throw error; }
  session.subscribers.add(subscriber);
  return {
    render(options, isCurrent = () => true) {
      if (subscriber.released) throw new Error('The shared bitmap rendering lease was released.');
      if (session.lost) throw new Error('The shared bitmap WebGL context was lost.');
      if (session.busy) throw new Error('A shared bitmap draw is already in progress.');
      if (!isCurrent() || subscriber.released) return false;
      const peak = session.renderer.estimate(options);
      const token = budget.reserve(subscriber, session.accounting, options.width, options.height, peak);
      session.busy = true;
      let bitmap: ImageBitmap | undefined;
      let consumed = false, presented = false, targetTouched = false, cleared = false;
      try {
        if (!options.width || !options.height) {
          renderBitmapGlyphs(options);
          if (!isCurrent() || subscriber.released) return false;
          targetTouched = true; resizeSharedBitmapCanvas(target, options.width, options.height);
          presented = true; return true;
        }
        session.renderer.render(options);
        if (!isCurrent() || subscriber.released) return false;
        bitmap = session.canvas.transferToImageBitmap();
        if (!isCurrent() || subscriber.released) return false;
        targetTouched = true; resizeSharedBitmapCanvas(target, options.width, options.height);
        presenter.transferFromImageBitmap(bitmap);
        consumed = true;
        presented = true;
        return true;
      } catch (error) {
        // A failed transfer may follow a successful resize. Drop that failed
        // backing store rather than retaining it under the old smaller charge.
        if (targetTouched) { resizeSharedBitmapCanvas(target, 0, 0); cleared = true; }
        throw error;
      } finally {
        if (bitmap && !consumed) bitmap.close();
        budget.settle(subscriber, session.accounting, token, session.renderer.bytes, presented, cleared);
        session.busy = false;
        if (!session.renderer.live || session.context.isContextLost()) invalidate(session);
      }
    },
    release() {
      if (subscriber.released) return;
      subscriber.released = true;
      session.subscribers.delete(subscriber);
      budget.release(subscriber);
      target.width = 0; target.height = 0;
      // Immediate StrictMode cleanup/setup can reacquire the same session.
      queueMicrotask(() => {
        if (!session.subscribers.size) destroy(session);
      });
    },
  };
}
