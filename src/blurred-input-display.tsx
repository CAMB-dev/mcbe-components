import { useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Match the single-line editor's normal-line rule, rather than fitting a font baseline. */
export function inputDisplayLineHeight(style: Pick<CSSStyleDeclaration, 'fontSize' | 'lineHeight' | 'height'>): string {
  const fontSize = Number.parseFloat(style.fontSize), lineHeight = Number.parseFloat(style.lineHeight);
  const height = Number.parseFloat(style.height);
  return !Number.isFinite(lineHeight) || fontSize >= lineHeight || height > lineHeight ? 'normal' : style.lineHeight;
}

interface BlurredInputDisplayProps {
  input: RefObject<HTMLInputElement | null>;
  field: RefObject<HTMLElement | null>;
  value: string;
  className: string;
  boxClassName: string;
  textClassName: string;
}

/** Private decorative counterpart. The original input owns editing and accessibility. */
export function BlurredInputDisplay({ input, field, value, className, boxClassName, textClassName }: BlurredInputDisplayProps) {
  const clip = useRef<HTMLSpanElement | null>(null), text = useRef<HTMLSpanElement | null>(null);
  const refresh = useRef<(() => void) | null>(null);
  useBrowserLayoutEffect(() => {
    const control = input.current, display = clip.current, content = text.current;
    // Child layout effects run before an ancestor host ref is attached. The
    // preceding input and our own display already have their committed parents.
    const host = control?.parentElement;
    const doc = control?.ownerDocument, view = doc?.defaultView;
    if (!control || !host || !display || !content || !doc || !view || display.parentElement !== host
      || host.ownerDocument !== doc || display.ownerDocument !== doc
      || (field.current !== null && field.current !== host)) return;
    const previousReady = host.getAttribute('data-mc-name-display');
    const previousComposing = host.getAttribute('data-mc-name-composing');
    let disposed = false, frame = 0;
    const update = () => {
      if (disposed || view.closed || !control.isConnected) return;
      // Read the actual input before our CSS suppresses its paint. This marker
      // never survives the synchronous read, including an exceptional read.
      const previousMeasuring = host.getAttribute('data-mc-name-measuring');
      try {
        host.setAttribute('data-mc-name-measuring', 'true');
        const style = view.getComputedStyle(control);
        display.style.font = style.font;
        display.style.color = style.color;
        display.style.textShadow = style.textShadow;
        display.style.direction = style.direction;
        display.style.letterSpacing = style.letterSpacing;
        display.style.wordSpacing = style.wordSpacing;
        display.style.textTransform = style.textTransform;
        display.style.fontKerning = style.fontKerning;
        display.style.fontFeatureSettings = style.fontFeatureSettings;
        display.style.fontVariationSettings = style.fontVariationSettings;
        display.style.fontOpticalSizing = style.fontOpticalSizing;
        display.style.setProperty('-webkit-text-fill-color', style.getPropertyValue('-webkit-text-fill-color'));
        content.style.lineHeight = inputDisplayLineHeight(style);
        host.setAttribute('data-mc-name-display', 'ready');
      } catch {
        // A detached/closing document keeps the complete semantic input paint.
        host.removeAttribute('data-mc-name-display');
      } finally {
        if (previousMeasuring === null) host.removeAttribute('data-mc-name-measuring');
        else host.setAttribute('data-mc-name-measuring', previousMeasuring);
      }
    };
    const schedule = () => {
      if (!disposed && !view.closed && !frame) frame = view.requestAnimationFrame(() => { frame = 0; update(); });
    };
    const compositionStart = () => { host.setAttribute('data-mc-name-composing', 'true'); update(); };
    const compositionEnd = () => { host.removeAttribute('data-mc-name-composing'); update(); };
    control.addEventListener('focus', update);
    control.addEventListener('blur', update);
    control.addEventListener('input', update);
    control.addEventListener('compositionstart', compositionStart);
    control.addEventListener('compositionend', compositionEnd);
    // Observe just this control and its ancestor attributes. This also catches
    // an already-loaded theme font applied by a later parent layout effect.
    const mutations = new view.MutationObserver(schedule);
    mutations.observe(control, { attributes: true, attributeFilter: ['class', 'style', 'disabled', 'readonly', 'dir'] });
    for (let ancestor: HTMLElement | null = host; ancestor; ancestor = ancestor.parentElement) {
      mutations.observe(ancestor, { attributes: true, attributeFilter: ['class', 'style', 'dir'] });
    }
    const resize = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(schedule) : null;
    resize?.observe(control); resize?.observe(host);
    view.addEventListener('resize', schedule);
    doc.fonts?.addEventListener('loadingdone', schedule);
    doc.fonts?.addEventListener('loadingerror', schedule);
    void doc.fonts?.ready.then(schedule, schedule);
    refresh.current = update;
    update();
    return () => {
      disposed = true;
      if (frame) view.cancelAnimationFrame(frame);
      mutations.disconnect(); resize?.disconnect();
      control.removeEventListener('focus', update);
      control.removeEventListener('blur', update);
      control.removeEventListener('input', update);
      control.removeEventListener('compositionstart', compositionStart);
      control.removeEventListener('compositionend', compositionEnd);
      view.removeEventListener('resize', schedule);
      doc.fonts?.removeEventListener('loadingdone', schedule);
      doc.fonts?.removeEventListener('loadingerror', schedule);
      if (refresh.current === update) refresh.current = null;
      if (host.getAttribute('data-mc-name-display') === 'ready') {
        if (previousReady === null) host.removeAttribute('data-mc-name-display');
        else host.setAttribute('data-mc-name-display', previousReady);
      }
      if (host.getAttribute('data-mc-name-composing') === 'true') {
        if (previousComposing === null) host.removeAttribute('data-mc-name-composing');
        else host.setAttribute('data-mc-name-composing', previousComposing);
      }
    };
  }, [input, field]);
  useBrowserLayoutEffect(() => { refresh.current?.(); }, [value]);
  return <span ref={clip} className={className} aria-hidden="true"><span className={boxClassName}>
    <span ref={text} className={textClassName}>{value}</span>
  </span></span>;
}
