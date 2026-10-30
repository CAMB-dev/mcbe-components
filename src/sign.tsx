import { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, HTMLAttributes, Ref, TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { Image } from './image';
import { signAssets } from './sign-assets';
import { lockModalScroll } from './modal-scroll-lock';

export type SignVariant = 'regular' | 'hanging';
export type SignWood = 'oak' | 'spruce' | 'birch' | 'jungle' | 'acacia' | 'dark-oak' | 'mangrove' | 'cherry' | 'bamboo' | 'crimson' | 'warped' | 'pale-oak' | 'poplar';
export type SignFontMode = 'auto' | 'latin' | 'unicode';
export interface SignTextureInput { src: string; sourceSize: readonly [number, number] }
export interface SignSourceGeometry {
  backgroundSize: readonly [number, number];
  backgroundOffset: readonly [number, number];
  editorSize: readonly [number, number];
  editorOffset: readonly [number, number];
}
export interface SignTextSurfaceProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML' | 'onChange' | 'defaultValue' | 'color' | 'onCancel' | 'onSubmit'> {
  variant?: SignVariant;
  /** Source filename association/default oak is an explicit candidate. */
  wood?: SignWood;
  texture?: SignTextureInput;
  /** Source box is retained. Aspect fit is the current observed candidate. */
  backgroundFit?: 'contain' | 'stretch';
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, event: ChangeEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  readOnly?: boolean;
  label?: string;
  scale?: number;
  geometry?: Partial<SignSourceGeometry>;
  textColor?: CSSProperties['color'];
  /** Explicit caller styling, not a recovered native glow algorithm. */
  textShadow?: CSSProperties['textShadow'];
  /** Auto selects one family for the whole value when Han is present. This is
   * the observed finite candidate, not all Unicode/engine font routing. */
  fontMode?: SignFontMode;
  maxLength?: number;
  autoFocus?: boolean;
  textareaRef?: Ref<HTMLTextAreaElement>;
  textareaProps?: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children' | 'dangerouslySetInnerHTML' | 'value' | 'defaultValue' | 'onChange' | 'disabled' | 'readOnly' | 'maxLength' | 'autoFocus'>;
}
export type SignCloseReason = 'outside' | 'escape';
export interface SignCloseDetail { reason: SignCloseReason }
export type SignExitBehavior = 'request' | 'commit' | 'cancel';
export interface SignEditorProps extends SignTextSurfaceProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, detail: SignCloseDetail) => void;
  backdropOpacity?: number;
  closeOnOutside?: boolean;
  exitBehavior?: SignExitBehavior;
  onCloseRequest?: (acceptedValue: string, detail: SignCloseDetail) => boolean | void;
  onCommit?: (acceptedValue: string, detail: SignCloseDetail) => boolean | void;
  onCancel?: (acceptedValue: string, detail: SignCloseDetail) => boolean | void;
  portalContainer?: HTMLElement | null;
  dialogRef?: Ref<HTMLDialogElement>;
}

const candidates = {
  oak: [signAssets.sign, signAssets.hanging_sign], spruce: [signAssets.sign_spruce, signAssets.hanging_sign_spruce],
  birch: [signAssets.sign_birch, signAssets.hanging_sign_birch], jungle: [signAssets.sign_jungle, signAssets.hanging_sign_jungle],
  acacia: [signAssets.sign_acacia, signAssets.hanging_sign_acacia], 'dark-oak': [signAssets.sign_darkoak, signAssets.hanging_sign_darkoak],
  mangrove: [signAssets.mangrove_sign, signAssets.hanging_sign_mangrove], cherry: [signAssets.cherry_sign, signAssets.hanging_sign_cherry],
  bamboo: [signAssets.bamboo_sign, signAssets.hanging_sign_bamboo], crimson: [signAssets.sign_crimson, signAssets.hanging_sign_crimson],
  warped: [signAssets.sign_warped, signAssets.hanging_sign_warped], 'pale-oak': [signAssets.pale_oak_sign, signAssets.hanging_sign_pale_oak],
  poplar: [signAssets.poplar_sign, signAssets.hanging_sign_poplar],
} as const;
const geometryDefaults: Record<SignVariant, SignSourceGeometry> = {
  regular: { backgroundSize: [192, 93], backgroundOffset: [-1, -5], editorSize: [185, 90], editorOffset: [0, 5] },
  hanging: { backgroundSize: [287, 143], backgroundOffset: [0, -32], editorSize: [126, 90], editorOffset: [0, 5] },
};
function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}
function finite(value: number, name: string, positive = false) {
  if (!Number.isFinite(value) || (positive && value <= 0)) throw new RangeError(`${name} must be ${positive ? 'positive and ' : ''}finite.`);
  return value;
}
function resolvedGeometry(variant: SignVariant, overrides: Partial<SignSourceGeometry> | undefined): SignSourceGeometry {
  const result = { ...geometryDefaults[variant], ...overrides };
  for (const key of ['backgroundSize', 'backgroundOffset', 'editorSize', 'editorOffset'] as const) {
    const pair = result[key];
    if (!Array.isArray(pair) || pair.length !== 2) throw new RangeError(`Invalid Sign ${key}.`);
    pair.forEach(value => finite(value, `Sign ${key}`, key.endsWith('Size')));
  }
  return result;
}
function useText(value: string | undefined, defaultValue: string, onChange: SignTextSurfaceProps['onValueChange']) {
  const [internal, setInternal] = useState(defaultValue);
  const accepted = value === undefined ? internal : value;
  const change = (next: string, event: ChangeEvent<HTMLTextAreaElement>) => {
    if (value === undefined) setInternal(next);
    onChange?.(next, event);
  };
  return [accepted, change] as const;
}
function resolvedFont(mode: SignFontMode, text: string): 'latin' | 'unicode' {
  return mode === 'auto' ? (/\p{Script=Han}/u.test(text) ? 'unicode' : 'latin') : mode;
}
function fontFamily(mode: 'latin' | 'unicode') {
  return mode === 'unicode' ? 'var(--mc-font-unicode,"MCBE CJK","Fusion Pixel",monospace)' : 'var(--mc-font,monospace)';
}

/** Complete original image + one real textarea. Logical source defaults and
 * candidate font/texture routing are not a native pixel certification. */
export const SignTextSurface = forwardRef<HTMLDivElement, SignTextSurfaceProps>(function SignTextSurface({
  variant = 'regular', wood = 'oak', texture, backgroundFit = 'contain', value, defaultValue = '', onValueChange,
  disabled = false, readOnly = false, label = variant === 'hanging' ? 'Hanging sign text' : 'Sign text',
  scale = 2, geometry, textColor, textShadow, fontMode = 'auto', maxLength = 32500,
  autoFocus = false, textareaRef, textareaProps = {}, className, style, ...props
}, ref) {
  finite(scale, 'Sign scale', true);
  if (!geometryDefaults[variant] || !candidates[wood]) throw new RangeError('Unknown Sign variant or wood.');
  if (!['auto', 'latin', 'unicode'].includes(fontMode)) throw new RangeError('Unknown Sign font mode.');
  if (!['contain', 'stretch'].includes(backgroundFit)) throw new RangeError('Unknown Sign background fit.');
  if (!Number.isSafeInteger(maxLength) || maxLength < 0) throw new RangeError('Sign maxLength must be a non-negative safe integer.');
  const [text, change] = useText(value, defaultValue, onValueChange);
  const acceptedText = useRef(text);
  acceptedText.current = text;
  const selectedFont = resolvedFont(fontMode, text);
  const selectedTexture = texture ?? candidates[wood][variant === 'hanging' ? 1 : 0];
  const g = resolvedGeometry(variant, geometry);
  const fit = Math.min(g.backgroundSize[0] / selectedTexture.sourceSize[0], g.backgroundSize[1] / selectedTexture.sourceSize[1]);
  const imageSize = backgroundFit === 'contain'
    ? [selectedTexture.sourceSize[0] * fit, selectedTexture.sourceSize[1] * fit] as const : g.backgroundSize;
  const id = useId();
  const { onCompositionStart, onCompositionUpdate, onCompositionEnd, className: inputClassName, style: inputStyle, ...inputProps } = textareaProps;
  const rootStyle: CSSProperties = {
    '--mc-sign-u': `${scale}px`, '--mc-sign-scale': scale, width: g.editorSize[0] * scale, height: g.editorSize[1] * scale,
    ...style,
  } as CSSProperties;
  const fieldStyle: CSSProperties = {
    left: g.editorOffset[0] * scale, top: g.editorOffset[1] * scale,
    width: g.editorSize[0] * scale, height: g.editorSize[1] * scale,
    '--mc-sign-font': fontFamily(selectedFont),
    ...(textColor !== undefined ? { color: textColor } : {}), ...(textShadow !== undefined ? { textShadow } : {}), ...inputStyle,
  } as CSSProperties;
  return <div {...props} ref={ref} className={['mc-sign-surface', className].filter(Boolean).join(' ')} style={rootStyle}
    data-sign-variant={variant} data-sign-wood={wood} data-sign-font-mode={selectedFont}
    data-sign-font-policy={fontMode === 'auto' ? 'whole-value-han-candidate' : 'caller'}
    data-sign-background-fit={backgroundFit}
    data-sign-texture-source={texture ? 'caller' : 'source-candidate'}>
    <Image className="mc-sign-surface__background" src={selectedTexture.src} sourceSize={selectedTexture.sourceSize}
      size={[imageSize[0] * scale, imageSize[1] * scale]} alt="" draggable={false}
      style={{ left: ((g.editorSize[0] - imageSize[0]) / 2 + g.editorOffset[0] + g.backgroundOffset[0]) * scale,
        top: ((g.editorSize[1] - imageSize[1]) / 2 + g.editorOffset[1] + g.backgroundOffset[1]) * scale }}/>
    <textarea {...inputProps} ref={textareaRef} id={inputProps.id ?? id} aria-label={inputProps['aria-label'] ?? label}
      className={['mc-sign-surface__input', inputClassName].filter(Boolean).join(' ')} style={fieldStyle}
      value={text} onChange={event => change(event.currentTarget.value, event)} disabled={disabled} readOnly={readOnly}
      maxLength={maxLength} autoFocus={autoFocus && !disabled} spellCheck={inputProps.spellCheck ?? false}
      onCompositionStart={event => {
        // Presentation only: do not set React text state/re-render a controlled
        // textarea merely to inspect its still-unaccepted composition text.
        const mode = resolvedFont(fontMode, event.currentTarget.value);
        event.currentTarget.style.setProperty('--mc-sign-font', fontFamily(mode));
        event.currentTarget.dataset.signComposingFontMode = mode;
        onCompositionStart?.(event);
      }}
      onCompositionUpdate={event => {
        const mode = resolvedFont(fontMode, event.currentTarget.value);
        event.currentTarget.style.setProperty('--mc-sign-font', fontFamily(mode));
        event.currentTarget.dataset.signComposingFontMode = mode;
        onCompositionUpdate?.(event);
      }}
      onCompositionEnd={event => {
        event.currentTarget.style.setProperty('--mc-sign-font', fontFamily(resolvedFont(fontMode, acceptedText.current)));
        delete event.currentTarget.dataset.signComposingFontMode;
        onCompositionEnd?.(event);
      }}/>
  </div>;
});

/** Headless native modal; no generic Dialog header/buttons/Panel. Host callbacks
 * own persistence. Source menu_exit does not establish save/rollback semantics. */
export const SignEditor = forwardRef<HTMLDivElement, SignEditorProps>(function SignEditor({
  open, defaultOpen = false, onOpenChange, value, defaultValue = '', onValueChange,
  backdropOpacity = .4, closeOnOutside = true, exitBehavior = 'request', onCloseRequest, onCommit, onCancel,
  portalContainer, dialogRef, autoFocus = true, textareaRef, textareaProps = {}, ...surfaceProps
}, ref) {
  finite(backdropOpacity, 'Sign backdrop opacity');
  if (backdropOpacity < 0 || backdropOpacity > 1) throw new RangeError('Sign backdrop opacity must be between0and1.');
  if (!['request', 'commit', 'cancel'].includes(exitBehavior)) throw new RangeError('Unknown Sign exit behavior.');
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open === undefined ? internalOpen : open;
  const [text, change] = useText(value, defaultValue, onValueChange);
  const [mounted, setMounted] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  const compositionEscape = useRef(false);
  const outsideStart = useRef(false);
  const outsideEnd = useRef(false);
  const requesting = useRef(false);
  const latest = useRef({ text, open, onOpenChange, onCloseRequest, onCommit, onCancel, exitBehavior, autoFocus });
  latest.current = { text, open, onOpenChange, onCloseRequest, onCommit, onCancel, exitBehavior, autoFocus };
  const setDialog = useCallback((node: HTMLDialogElement | null) => { dialog.current = node; assignRef(dialogRef, node); }, [dialogRef]);
  const setInput = useCallback((node: HTMLTextAreaElement | null) => { input.current = node; assignRef(textareaRef, node); }, [textareaRef]);
  useEffect(() => { setMounted(true); }, []);
  const container = portalContainer ?? (mounted && typeof document !== 'undefined' ? document.body : null);
  useEffect(() => {
    const node = dialog.current;
    if (!mounted || !isOpen || !container || !node) return;
    const doc = node.ownerDocument;
    const previous = doc.activeElement as HTMLElement | null;
    node.showModal();
    const unlock = lockModalScroll(doc);
    if (latest.current.autoFocus && input.current && !input.current.disabled) input.current.focus();
    else node.focus();
    return () => {
      composing.current = false;
      compositionEscape.current = false;
      outsideStart.current = false;
      outsideEnd.current = false;
      if (node.open) node.close();
      unlock();
      // Native showModal supplies inertness. Do not steal focus from a later
      // modal when an underlying screen is removed out of order.
      const other = doc.querySelector<HTMLDialogElement>('dialog[open]');
      if (previous?.isConnected && typeof previous.focus === 'function'
        && (!other || other.contains(previous)) && !previous.closest('dialog:not([open])')) previous.focus();
    };
  }, [mounted, isOpen, container]);
  const requestClose = (reason: SignCloseReason) => {
    if (composing.current || requesting.current) return;
    requesting.current = true;
    try {
      const state = latest.current, detail = { reason };
      if (state.onCloseRequest?.(state.text, detail) === false) return;
      if (state.exitBehavior === 'commit' && state.onCommit?.(state.text, detail) === false) return;
      if (state.exitBehavior === 'cancel' && state.onCancel?.(state.text, detail) === false) return;
      if (state.open === undefined) setInternalOpen(false);
      state.onOpenChange?.(false, detail);
    } finally { requesting.current = false; }
  };
  if (!mounted || !isOpen || !container) return null;
  const { onCompositionStart, onCompositionUpdate, onCompositionEnd, ...otherInputProps } = textareaProps;
  return createPortal(<dialog ref={setDialog} className="mc-sign-editor" data-sign-editor="" tabIndex={-1}
    data-sign-fallback-focus={surfaceProps.disabled || undefined}
    aria-label={surfaceProps.label ?? (surfaceProps.variant === 'hanging' ? 'Edit hanging sign' : 'Edit sign')}
    style={{ backgroundColor: `rgba(0,0,0,${backdropOpacity})` }}
    onCancel={event => { event.preventDefault(); if (!compositionEscape.current) requestClose('escape'); }}
    onKeyDownCapture={event => {
      if (event.key === 'Escape') {
        compositionEscape.current = composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229;
        if (compositionEscape.current) event.preventDefault();
      }
    }}
    onKeyDown={event => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') {
        // Stop native dialog cancel even if a child stops key propagation or
        // the composition event has not finished its accepted-value commit.
        event.preventDefault();
        if (!event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) requestClose('escape');
      }
      if (event.key === 'Tab') {
        const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('textarea,input,button,select,a[href],[tabindex]'))
          .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[hidden],[inert]') && element.getClientRects().length > 0);
        const first = focusable[0], last = focusable.at(-1);
        if (!first) { event.preventDefault(); event.currentTarget.focus(); }
        else if (event.shiftKey && event.currentTarget.ownerDocument.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && event.currentTarget.ownerDocument.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}
    onPointerDown={event => { outsideStart.current = event.target === event.currentTarget && event.button === 0; outsideEnd.current = false; }}
    onPointerUp={event => { outsideEnd.current = event.target === event.currentTarget; }}
    onPointerCancel={() => { outsideStart.current = false; outsideEnd.current = false; }}
    onClick={event => {
      const outside = outsideStart.current && outsideEnd.current && event.target === event.currentTarget;
      outsideStart.current = false;
      outsideEnd.current = false;
      if (closeOnOutside && outside) requestClose('outside');
    }}>
    <SignTextSurface {...surfaceProps} ref={ref} value={text} onValueChange={change} autoFocus={false} textareaRef={setInput}
      textareaProps={{ ...otherInputProps,
        onCompositionStart: event => { composing.current = true; onCompositionStart?.(event); },
        onCompositionUpdate: event => { composing.current = true; onCompositionUpdate?.(event); },
        onCompositionEnd: event => { composing.current = false; compositionEscape.current = false; onCompositionEnd?.(event); },
      }}/>
  </dialog>, container);
});
