import { forwardRef, useCallback, useRef } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode, Ref } from 'react';
import { Button } from './components';
import { EmoteWheel } from './emote-wheel';
import type { EmoteWheelProps } from './emote-wheel';
import { Text } from './text';
import { emoteWheelAssets } from './emote-wheel-assets';

export interface EmoteWheelScreenLabels {
  keyboardInstruction: string;
  touchInstruction: string;
  changeEmotes: string;
}
export interface EmoteWheelScreenCloseDetail {
  reason: 'outside' | 'escape';
  event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>;
}
export interface EmoteWheelScreenProps extends Omit<EmoteWheelProps, 'size' | 'onCancel'> {
  /** Whole transparent screen frame, in logical units. Small frames clip the
   * source stack rather than shrinking its controls. */
  size?: readonly [number, number];
  labels?: Partial<EmoteWheelScreenLabels>;
  /** Dynamic gamepad bindings are supplied already formatted by the host. */
  gamepadInstruction?: string;
  gamepadExitLabel?: string;
  gamepadStartGlyph?: ReactNode;
  gamepadStartDescription?: string;
  wheelRef?: Ref<HTMLDivElement>;
  changeButtonRef?: Ref<HTMLButtonElement>;
  changeEmotesVisible?: boolean;
  changeEmotesDisabled?: boolean;
  onChangeEmotes?: (event: MouseEvent<HTMLButtonElement>) => void;
  onCloseRequest?: (detail: EmoteWheelScreenCloseDetail) => void;
}

const defaultLabels: EmoteWheelScreenLabels = {
  keyboardInstruction: 'Use Hotkey or Mouse to activate Emote',
  touchInstruction: 'Tap emote to activate',
  changeEmotes: 'Change Emotes',
};
const imageUrl = (src: string) => `url(${JSON.stringify(src)})`;
function assignRef<T>(ref: Ref<T> | undefined, value: T | null) { if (typeof ref === 'function') ref(value); else if (ref) ref.current = value; }

/** Whole source composition with inline Web request semantics. There is no
 * modal lock, focus trap, platform detection or emote/dressing-room service. */
export const EmoteWheelScreen = forwardRef<HTMLDivElement, EmoteWheelScreenProps>(function EmoteWheelScreen({
  slots, activeIndex, defaultActiveIndex, onActiveIndexChange, onActivate, centerLabel, inputMode = 'pointer', hints, buttonRefs,
  disabled = false, label, size = [400, 300], scale = 2, labels: givenLabels, gamepadInstruction,
  gamepadExitLabel, gamepadStartGlyph, gamepadStartDescription, wheelRef, changeButtonRef, changeEmotesVisible = true, changeEmotesDisabled = false,
  onChangeEmotes, onCloseRequest, className, style, onClick, onKeyDown, onKeyDownCapture, ...props
}, ref) {
  if (!Number.isSafeInteger(scale) || scale < 1) throw new RangeError('Emote scale must be a positive safe integer.');
  if (!Array.isArray(size) || size.length !== 2 || !size.every(value => Number.isFinite(value) && value > 0 && Number.isFinite(value * scale))) throw new RangeError('Emote screen size requires two positive finite logical dimensions.');
  const labels = { ...defaultLabels, ...Object.fromEntries(Object.entries(givenLabels ?? {}).filter(([, value]) => value !== undefined)) };
  if (Object.values(labels).some(value => typeof value !== 'string') || [gamepadInstruction, gamepadExitLabel, gamepadStartDescription].some(value => value !== undefined && typeof value !== 'string')) throw new RangeError('Emote screen labels must be strings.');
  const wheelHost = useRef<HTMLDivElement | null>(null), instruction = useRef<HTMLDivElement | null>(null), changeRow = useRef<HTMLDivElement | null>(null);
  const wheelNode = useRef<HTMLDivElement | null>(null), changeButtonNode = useRef<HTMLButtonElement | null>(null);
  const attachWheel = useCallback((node: HTMLDivElement | null) => { wheelNode.current = node; assignRef(wheelRef, node); }, [wheelRef]);
  const attachChangeButton = useCallback((node: HTMLButtonElement | null) => { changeButtonNode.current = node; assignRef(changeButtonRef, node); }, [changeButtonRef]);
  const gamepad = inputMode === 'gamepad';
  const instructionText = gamepad ? gamepadInstruction : inputMode === 'touch' ? labels.touchInstruction : labels.keyboardInstruction;
  const hasStart = gamepadStartGlyph != null || gamepadStartDescription !== undefined;
  const hasHelper = gamepad && (hasStart || gamepadExitLabel !== undefined);
  return <div {...props} ref={ref} role={props.role ?? 'region'} aria-label={props['aria-label'] ?? label} aria-disabled={disabled || undefined}
    tabIndex={props.tabIndex ?? -1} className={['mc-emote-wheel-screen', className].filter(Boolean).join(' ')} data-input-mode={inputMode}
    style={{ '--mc-emote-screen-u': `${scale}px`, '--mc-emote-screen-black': imageUrl(emoteWheelAssets.black.url),
      '--mc-emote-screen-button': imageUrl(emoteWheelAssets.buttonLight.url), '--mc-emote-screen-button-hover': imageUrl(emoteWheelAssets.buttonLightHover.url),
      '--mc-emote-screen-button-pressed': imageUrl(emoteWheelAssets.buttonLightPressed.url), '--mc-emote-screen-button-disabled': imageUrl(emoteWheelAssets.buttonLightDisabled.url),
      '--mc-emote-screen-focus': imageUrl(emoteWheelAssets.focusWhite.url), width: size[0] * scale, height: size[1] * scale, ...style } as CSSProperties}
    onClick={event => {
      onClick?.(event); if (event.defaultPrevented || disabled) return;
      const target = event.target as Node;
      // The Web outside zone excludes the wheel's square (including its dead
      // zone), instructions and reserved action row. Native hit routing is not
      // inferred from the state PNG alpha.
      const wheelSquare = wheelHost.current?.querySelector('.mc-emote-wheel__wheel'), rect = wheelSquare?.getBoundingClientRect();
      // Pointer capture can retarget a wheel release to its larger root. The
      // point check is input routing only; it never supplies render geometry.
      const inSquare = event.detail > 0 && rect && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (wheelSquare?.contains(target) || inSquare || instruction.current?.contains(target) || changeRow.current?.contains(target)) return;
      onCloseRequest?.({ reason: 'outside', event });
    }}
    onKeyDownCapture={event => {
      onKeyDownCapture?.(event);
      if (event.key !== 'Escape') return;
      // Escape is composed here before the child wheel can clear selection.
      // Both caller callbacks see the Screen as currentTarget and may veto it.
      onKeyDown?.(event);
      if (!event.defaultPrevented && !disabled && !gamepad && !event.nativeEvent.isComposing && event.keyCode !== 229 && !event.altKey && !event.ctrlKey && !event.metaKey) {
        onCloseRequest?.({ reason: 'escape', event }); event.preventDefault();
      }
      event.stopPropagation();
    }}
    onKeyDown={event => {
      if (event.key === 'Escape') return;
      onKeyDown?.(event);
      if (event.defaultPrevented || disabled || changeEmotesDisabled || !changeEmotesVisible || event.nativeEvent.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey || event.target !== changeButtonNode.current) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { wheelNode.current?.focus({ preventScroll: true }); event.preventDefault(); }
      else if (event.key === 'ArrowDown') { event.preventDefault(); event.stopPropagation(); }
    }}>
    <div className="mc-emote-wheel-screen__fill" aria-hidden="true"/>
    <div className="mc-emote-wheel-screen__wheel-root" ref={wheelHost}>
      <EmoteWheel slots={slots} activeIndex={activeIndex} defaultActiveIndex={defaultActiveIndex} onActiveIndexChange={onActiveIndexChange} onActivate={onActivate}
        centerLabel={centerLabel} inputMode={inputMode} hints={hints} buttonRefs={buttonRefs} disabled={disabled} label={label} scale={scale}
        size={[size[0], size[1] * .55 + 35]} ref={attachWheel} style={{ width: '100%', height: '100%' }}/>
    </div>
    <div className="mc-emote-wheel-screen__gap" aria-hidden="true"/>
    <div className="mc-emote-wheel-screen__instruction" ref={instruction}>
      <div className="mc-emote-wheel-screen__instruction-box">
        <span className="mc-emote-wheel-screen__instruction-background" aria-hidden="true"/>
        <div className="mc-emote-wheel-screen__instruction-content">
          {instructionText !== undefined && <Text className={['mc-emote-wheel-screen__instruction-text', gamepad && 'mc-emote-wheel-screen__instruction-text--gamepad'].filter(Boolean).join(' ')}>{instructionText}</Text>}
          {hasHelper && <div className="mc-emote-wheel-screen__gamepad-helpers">
            {hasStart && <div className="mc-emote-wheel-screen__start-helper">
              <span className="mc-emote-wheel-screen__start-glyph" aria-hidden="true">{gamepadStartGlyph}</span>
              {gamepadStartDescription !== undefined && <span className="mc-emote-wheel-screen__start-description-panel"><Text className="mc-emote-wheel-screen__start-description">{gamepadStartDescription}</Text></span>}
            </div>}
            {gamepadExitLabel !== undefined && <Text className="mc-emote-wheel-screen__exit-label" shadow={false}>{gamepadExitLabel}</Text>}
          </div>}
        </div>
      </div>
    </div>
    <div className="mc-emote-wheel-screen__change-row" hidden={gamepad} ref={changeRow}>
      <Button className="mc-emote-wheel-screen__change-button" ref={attachChangeButton} hidden={!changeEmotesVisible} disabled={disabled || changeEmotesDisabled}
        onClick={event => { if (!event.defaultPrevented && !disabled && changeEmotesVisible && !changeEmotesDisabled) onChangeEmotes?.(event); }}>{labels.changeEmotes}</Button>
    </div>
    <div className="mc-emote-wheel-screen__fill" aria-hidden="true"/>
  </div>;
});
