import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, Ref } from 'react';

export type ScreenshotFlashTrigger = string | number;
/** A standard exponential-in Web mapping, not a recovered native in_expo implementation. */
export type ScreenshotFlashEasing = 'web-in-expo' | 'linear' | ((progress: number) => number);
export type ScreenshotFlashControl = { kind: 'alpha'; value: number } | { kind: 'progress'; value: number };
export interface ScreenshotFlashImage { src: string; sourceSize: readonly [number, number] }
export interface ScreenshotFlashFinishedDetail {
  trigger: ScreenshotFlashTrigger;
  mode: 'timeline' | 'alpha' | 'progress';
  /** Observed client monotonic time since activation, not the native engine clock. */
  elapsedMs: number;
  reducedMotion: boolean;
}
type ScreenshotFlashFrame = { size: readonly [number, number]; scale?: number } | { size: 'parent'; scale?: never };
export type ScreenshotFlashProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML'> & ScreenshotFlashFrame & {
  /** Required resolved duration. The source and fixed globals declare no default. */
  durationMs: number;
  /** Required host material. There is no implicit textures/ui/White or casefold alias. */
  flashImage: ScreenshotFlashImage;
  /** null is idle; a changed non-null primitive starts a new activation. */
  trigger: ScreenshotFlashTrigger | null;
  visible?: boolean;
  cancelled?: boolean;
  /** Controlled values bypass RAF and automatic reduced-motion policy. */
  control?: ScreenshotFlashControl;
  easing?: ScreenshotFlashEasing;
  motion?: 'system' | 'animate' | 'skip';
  onFinished?: (detail: ScreenshotFlashFinishedDetail) => void;
};

const sourceBackground = new URL('./assets/jigsaw/control.png', import.meta.url).href;
const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
interface Activation {
  id: number;
  trigger: ScreenshotFlashTrigger;
  startedAt: number;
  durationMs: number;
  easing: ScreenshotFlashEasing;
  finished: boolean;
}
interface Clock { id: number; progress: number; finished: boolean }

function unitInterval(value: number, name: string) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(`${name} must be finite and between zero and one.`);
}
function checkImage(image: ScreenshotFlashImage) {
  if (!image || typeof image.src !== 'string' || !image.src.trim()) throw new TypeError('Screenshot flashImage requires a nonempty resolved src.');
  if (!Array.isArray(image.sourceSize) || image.sourceSize.length !== 2 || !image.sourceSize.every(value => Number.isSafeInteger(value) && value > 0)) throw new RangeError('Screenshot flashImage sourceSize requires two positive safe integers.');
}
function resolveEasing(easing: ScreenshotFlashEasing, progress: number) {
  const value = typeof easing === 'function' ? easing(progress) : easing === 'linear' ? progress : progress === 0 ? 0 : progress === 1 ? 1 : 2 ** (10 * progress - 10);
  unitInterval(value, 'Screenshot easing result');
  return value;
}
function mergedRef<T>(own: { current: T | null }, supplied: Ref<T> | undefined) {
  let attached: T | null = null;
  let cleanup: (() => void) | undefined;
  // React 18 warns about returned ref cleanups and does not invoke them. Keep
  // the callback void on both peers and adapt the caller's cleanup ourselves.
  return (node: T | null): void => {
    if (node === attached) return;
    if (attached !== null) {
      const previous = attached, release = cleanup;
      attached = null; cleanup = undefined;
      if (own.current === previous) own.current = null;
      if (release) release();
      else if (typeof supplied === 'function') supplied(null);
      else if (supplied && supplied.current === previous) supplied.current = null;
    }
    if (node !== null) {
      attached = node; own.current = node;
      if (typeof supplied === 'function') {
        const release = supplied(node);
        if (typeof release === 'function') cleanup = release;
      } else if (supplied) supplied.current = node;
    }
  };
}

/** Source screen visual only: no camera, capture, storage, or automatic screen-close action.
 * The source feed background remains after completion until the host hides/cancels
 * the activation. Duration/easing are snapshotted for each automatic activation. */
export const ScreenshotFlash = forwardRef<HTMLDivElement, ScreenshotFlashProps>(function ScreenshotFlash({
  size, scale, durationMs, flashImage, trigger, visible = true, cancelled = false, control,
  easing = 'web-in-expo', motion = 'system', onFinished, hidden, className = '', style, ...props
}, forwardedRef) {
  if (!Number.isFinite(durationMs) || durationMs < 0) throw new RangeError('Screenshot durationMs must be finite and nonnegative.');
  if (trigger !== null && typeof trigger !== 'string' && (typeof trigger !== 'number' || !Number.isFinite(trigger))) throw new TypeError('Screenshot trigger must be null, a string, or a finite number.');
  if (!['system', 'animate', 'skip'].includes(motion)) throw new RangeError('Unknown Screenshot motion policy.');
  if (typeof easing !== 'function' && easing !== 'web-in-expo' && easing !== 'linear') throw new RangeError('Unknown Screenshot easing.');
  if (control) { if (control.kind !== 'alpha' && control.kind !== 'progress') throw new RangeError('Unknown Screenshot control kind.'); unitInterval(control.value, 'Screenshot control value'); }
  checkImage(flashImage);
  let frame: CSSProperties;
  if (size === 'parent') {
    if (scale !== undefined) throw new RangeError('Screenshot parent frame is already resolved; do not supply scale.');
    frame = { position: 'absolute', inset: 0, width: '100%', height: '100%' };
  } else {
    const unit = scale ?? 1;
    if (!Number.isSafeInteger(unit) || unit < 1) throw new RangeError('Screenshot scale must be a positive safe integer.');
    if (!Array.isArray(size) || size.length !== 2 || !size.every(value => Number.isFinite(value) && value > 0 && Number.isFinite(value * unit))) throw new RangeError('Screenshot size requires two positive finite logical dimensions.');
    frame = { width: size[0] * unit, height: size[1] * unit };
  }

  const root = useRef<HTMLDivElement>(null);
  const ref = useCallback(mergedRef(root, forwardedRef), [forwardedRef]);
  const activation = useRef<Activation | null>(null), nextId = useRef(0), callback = useRef(onFinished);
  const [clock, setClock] = useState<Clock>({ id: 0, progress: 0, finished: false });
  const [systemReduced, setSystemReduced] = useState(false), reduced = useRef(false);
  const active = trigger !== null && visible && !hidden && !cancelled;
  const mode = control?.kind ?? 'timeline';
  const controlledValue = control?.value;
  useClientLayoutEffect(() => { callback.current = onFinished; }, [onFinished]);
  useClientLayoutEffect(() => {
    const win = root.current?.ownerDocument.defaultView;
    if (control || motion !== 'system' || !active || !win?.matchMedia) { reduced.current = false; setSystemReduced(false); return; }
    const media = win.matchMedia('(prefers-reduced-motion: reduce)');
    let alive = true;
    const update = () => { if (!alive) return; reduced.current = media.matches; setSystemReduced(media.matches); };
    update(); media.addEventListener('change', update);
    return () => { alive = false; media.removeEventListener('change', update); };
  }, [active, mode, motion]);
  useClientLayoutEffect(() => {
    if (!active || trigger === null) { activation.current = null; setClock(old => old.id === 0 ? old : { id: 0, progress: 0, finished: false }); return; }
    const win = root.current?.ownerDocument.defaultView;
    if (!win) return;
    let run = activation.current;
    if (!run || !Object.is(run.trigger, trigger)) {
      run = { id: ++nextId.current, trigger, startedAt: win.performance.now(), durationMs, easing, finished: false };
      activation.current = run;
    }
    const current = run;
    let alive = true, pending: number | null = null;
    const elapsed = () => Math.max(0, win.performance.now() - current.startedAt);
    const finish = (reducedMotion: boolean) => {
      if (!alive || activation.current !== current || current.finished) return;
      current.finished = true;
      setClock(old => ({ id: current.id, progress: old.id === current.id ? old.progress : 0, finished: true }));
      callback.current?.({ trigger: current.trigger, mode, elapsedMs: elapsed(), reducedMotion });
    };
    const paint = (progress: number) => {
      if (!alive || activation.current !== current) return;
      setClock(old => old.id === current.id && old.progress === progress && old.finished === current.finished ? old : { id: current.id, progress, finished: current.finished });
    };
    if (control) {
      // A controlled material clock can move backwards; its completion latch is
      // still once per activation, not once for each zero/one crossing.
      paint(0);
      if (control.kind === 'alpha' ? control.value === 0 : control.value === 1) finish(false);
    } else {
      const skip = motion === 'skip' || (motion === 'system' && reduced.current);
      if (current.finished || skip || current.durationMs === 0) { paint(1); if (!current.finished) finish(skip); }
      else {
        const tick = () => {
          pending = null;
          if (!alive || activation.current !== current) return;
          const progress = Math.min(1, elapsed() / current.durationMs);
          paint(progress);
          if (progress === 1) finish(false);
          else pending = win.requestAnimationFrame(tick);
        };
        tick();
      }
    }
    return () => { alive = false; if (pending !== null) win.cancelAnimationFrame(pending); };
  // A changed duration/curve does not replay a finished activation. Automatic
  // settings are snapshotted above; controlled progress uses the current curve.
  }, [active, trigger, mode, controlledValue, durationMs, easing, motion, systemReduced]);

  const current = active && activation.current && Object.is(activation.current.trigger, trigger) ? activation.current : null;
  const progress = control?.kind === 'progress' ? control.value : current && clock.id === current.id ? clock.progress : motion === 'skip' || durationMs === 0 ? 1 : 0;
  const alpha = !active ? 0 : control?.kind === 'alpha' ? control.value : 1 - resolveEasing(control ? easing : current?.easing ?? easing, progress);
  const complete = control?.kind === 'alpha' ? control.value === 0 : progress === 1;
  const phase = cancelled ? 'cancelled' : !visible || hidden ? 'hidden' : trigger === null ? 'idle' : complete ? 'finished' : 'running';
  return <div {...props} ref={ref} hidden={!active} aria-hidden="true" tabIndex={-1}
    className={`mc-screenshot-flash ${className}`} data-phase={phase} data-mode={mode} data-alpha={alpha}
    data-progress={control?.kind === 'alpha' ? undefined : progress} data-finished={current && clock.id === current.id ? clock.finished : false}
    style={{ ...frame, ...style, pointerEvents: 'none', ...(!active ? { display: 'none' } : {}) }}>
    {active && <>
      <img className="mc-screenshot-flash__background" src={sourceBackground} width={2} height={2} alt="" draggable={false} />
      <img className="mc-screenshot-flash__image" src={flashImage.src} width={flashImage.sourceSize[0]} height={flashImage.sourceSize[1]} alt="" draggable={false} style={{ opacity: alpha }} />
    </>}
  </div>;
});
