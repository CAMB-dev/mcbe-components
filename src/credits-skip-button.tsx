import { forwardRef, useMemo, useRef } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, MouseEvent } from 'react';
import { BitmapText } from './bitmap-text';
import type { BitmapTextRenderer } from './bitmap-text';
import { ClassicSkin } from './classic-skin';
import { deferClassicRequest, useClassicNodeRef } from './classic-screen-lifecycle';
import { layoutCredits } from './credits-layout';
import type { CreditsLayoutProfile, CreditsLayoutRun, CreditsTextStyle } from './credits-types';
import { startMenuAssets } from './start-menu-assets';

export interface CreditsSkipActionDetail {
  readonly target: 'button.menu_exit';
  readonly origin: 'control';
  readonly event: MouseEvent<HTMLButtonElement>;
}
export interface CreditsSkipButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'disabled' | 'children' | 'dangerouslySetInnerHTML' | 'onError'> {
  readonly label: string;
  readonly labelStyle: CreditsTextStyle;
  readonly scale: number;
  readonly visible?: boolean;
  readonly disabled?: boolean;
  /** Explicit logical label-box resolution of native %c; height must fit source max10.
   * Otherwise measured advance and min(lineHeight,10) are used. This is a Web policy. */
  readonly labelSize?: readonly [number, number];
  readonly bitmapRenderer?: BitmapTextRenderer;
  /** Parent run/panel/child-generation identity; changing it drops a queued request. */
  readonly requestKey?: string;
  /** Parent's latest ownership/state guard, in addition to this button's own checks. */
  readonly isActive?: (button: HTMLButtonElement) => boolean;
  readonly onAction?: (detail: CreditsSkipActionDetail) => void;
  readonly onRenderError?: (error: Error) => void;
}

/** Private one-line fit: actual Credits font/fallback resolution, no HTML/font guess.
 * Color is source normal/locked30%, hover/pressed white; source label shadow=false.
 */
function labelLayout(label: string, labelStyle: CreditsTextStyle) {
  const style: CreditsTextStyle = { ...labelStyle, shadow: null };
  const block = { before: 0, after: 0, insetStart: 0, insetEnd: 0 };
  const profile: CreditsLayoutProfile = {
    viewport: { size: [8192, style.lineHeight], contentWidth: 8192, contentX: 0 },
    styles: { section: style, discipline: style, title: style, name: style, poem: style, quote: style },
    blocks: { section: block, discipline: block, title: block, name: block, poem: block, quote: block },
    emptyDiscipline: 'omit-and-collapse', emptyTitle: 'omit-and-collapse', paragraphs: 'hard-lines', paragraphGap: 0,
    paragraphBlankLines: 'collapse', wrap: 'preserve-lines', longWord: 'error', horizontalWhitespace: 'preserve', wrapWhitespace: 'retain',
    textAlign: { section: 'left', discipline: 'left', title: 'left', name: 'left', poem: 'left', quote: 'left' }, gatedStageSpacing: 'omit',
    markup: { roles: [], colors: { '2': '#fff', '3': '#fff', '7': '#fff', a: '#fff', b: '#fff', f: '#fff' }, obfuscated: { alphabet: 'x', periodMs: 1, seed: 0, preserveAdvance: true }, colorResetsObfuscated: false, resetCode: null, playerNameToken: { token: 'PLAYERNAME', replacement: 'literal-all' }, unknownCode: 'literal' },
    limits: { maxSections: 1, maxDisciplines: 1, maxTitles: 1, maxNames: 1, maxInputUnits: 4096, maxExpandedUnits: 4096, maxTokens: 8192, maxParagraphs: 1, maxLines: 1, maxRuns: 4096, maxStages: 1, maxFontGlyphs: 100000, maxMeasureCalls: 8192, maxMeasuredUnits: 20000000, maxContentHeight: 1000000 },
    provenance: 'host-resolved-web-profile', evidenceId: 'credits-skip-one-line-explicit-web-fit'
  };
  const layout = layoutCredits({ content: { sections: [{ section: label, disciplines: [] }], endPoem: '', quote: '' }, profile,
    plan: { stages: [{ id: 'skip-label', kind: 'staff', before: 0, after: 0 }], initialLead: 0, completionGap: 0 },
    bindings: { showEduIcon: false, showEndPoem: false, playerName: '' } });
  if (layout.lines.length !== 1) throw new RangeError('Credits Skip requires one resolved label line');
  return layout.lines[0]!;
}

export const CreditsSkipButton = forwardRef<HTMLButtonElement, CreditsSkipButtonProps>(function CreditsSkipButton({
  label, labelStyle, scale, visible = true, disabled = false, labelSize, bitmapRenderer, requestKey = '', isActive, onAction,
  onRenderError, onClick, hidden = false, className = '', style, ...native
}, forwardedRef) {
  if (typeof label !== 'string' || !label.trim() || /[\r\n]/.test(label) || label.length > 4096) throw new TypeError('Credits Skip label must be a nonempty single line within4096 units');
  if (!Number.isSafeInteger(scale) || scale < 1) throw new RangeError('Credits Skip scale must be a positive integer');
  if (typeof visible !== 'boolean' || typeof disabled !== 'boolean' || typeof hidden !== 'boolean') throw new TypeError('Credits Skip flags must be boolean');
  if (typeof requestKey !== 'string') throw new TypeError('Credits Skip requestKey must be a string');
  const line = useMemo(() => labelLayout(label, labelStyle), [label, labelStyle]);
  const width = labelSize?.[0] ?? line.width, height = labelSize?.[1] ?? Math.min(line.height, 10);
  if (labelSize && (!Array.isArray(labelSize) || labelSize.length !== 2)) throw new TypeError('Credits Skip labelSize requires two dimensions');
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0 || height > 10 || (width + 6) * scale > 8192 || (height + 6) * scale > 8192 || (width + 6) * (height + 6) * scale * scale > 4194304) throw new RangeError('Credits Skip label box must fit the finite Web budget and source10px max height');
  const [node, attach] = useClassicNodeRef(forwardedRef);
  const currentLayout = useRef(line);
  currentLayout.current = line;
  const current = useRef({ label, requestKey, visible, disabled, hidden, isActive, onAction, onRenderError });
  current.current = { label, requestKey, visible, disabled, hidden, isActive, onAction, onRenderError };
  const valid = (button: HTMLButtonElement) => {
    const p = current.current;
    return node.current === button && button.isConnected && button.getAttribute('data-credits-skip-owner') === 'button.menu_exit'
      && !button.disabled && p.visible && !p.disabled && !p.hidden && !button.closest('[hidden],[inert]') && (p.isActive?.(button) ?? true);
  };
  const error = (failure: Error) => {
    const button = node.current, p = current.current;
    if (button?.isConnected && currentLayout.current === line && p.requestKey === requestKey
      && p.visible && !p.hidden && !button.closest('[hidden],[inert]') && (p.isActive?.(button) ?? true)) p.onRenderError?.(failure);
  };
  const renderRun = (run: CreditsLayoutRun, color: string, key: number) => {
    const font = run.font;
    const position: CSSProperties = { position: 'absolute', left: run.x * scale, top: 0, color, whiteSpace: 'pre', lineHeight: 1, margin: 0, padding: 0, border: 0, textShadow: 'none' };
    if (font.kind === 'css-face') return <span key={key} className="mc-credits-skip__css-label" style={{ ...position, fontFamily: font.family, fontSize: font.fontSize * scale, letterSpacing: run.letterSpacing * scale }}>{run.resolvedText}</span>;
    const bitmap = (text: string, x: number, itemKey?: number) => <BitmapText key={itemKey} font={font.font} scale={font.scale * scale}
      sampling={font.sampling} shader={font.shader} profile={font.renderProfile} renderer={bitmapRenderer} layout="advance" color={color}
      onRenderError={error} style={{ ...position, left: x * scale }}>{text}</BitmapText>;
    return <span key={key}>{run.letterSpacing === 0 ? bitmap(run.resolvedText, run.x) : run.characters.map((character, index) => bitmap(character.resolvedText, character.x, index))}</span>;
  };
  const states = [
    { name: 'normal', asset: startMenuAssets.buttonLight, color: 'rgb(30% 30% 30%)', border: .075, layer: 1 },
    { name: 'hover', asset: startMenuAssets.buttonLightHover, color: '#fff', border: 1, layer: 4 },
    { name: 'pressed', asset: startMenuAssets.buttonLightPressed, color: '#fff', border: 1, layer: 5 },
    { name: 'locked', asset: startMenuAssets.buttonDisabled, color: 'rgb(30% 30% 30%)', border: .075, layer: 1 }
  ] as const;
  return <button {...native} ref={attach} type="button" disabled={disabled} hidden={hidden || !visible}
    aria-label={native['aria-label'] ?? (native['aria-labelledby'] ? undefined : label)} data-credits-skip-owner="button.menu_exit" data-credits-action="button.menu_exit"
    data-source-control="common_buttons.light_text_form_fitting_button" data-source-label-shadow="false"
    data-layout-policy="explicit-web-label-plus6-image-inset1" data-logical-label-size={`${width},${height}`}
    className={`mc-credits-skip ${className}`} style={{ ...style, width: (width + 6) * scale, height: (height + 6) * scale, '--mc-credits-skip-unit': `${scale}px` } as CSSProperties}
    onClick={event => {
      onClick?.(event);
      const button = event.currentTarget, snapshot = current.current;
      if (event.defaultPrevented || event.nativeEvent.defaultPrevented || !valid(button)) return;
      deferClassicRequest(event, button, accepted => current.current.onAction?.({ target: 'button.menu_exit', origin: 'control', event: accepted }),
        () => valid(button) && current.current.requestKey === snapshot.requestKey && current.current.label === snapshot.label);
    }}>
    {states.map(state => <span key={state.name} className={`mc-credits-skip__state mc-credits-skip__state--${state.name}`} aria-hidden="true" data-source-state={state.name} style={{ zIndex: state.layer }}>
      <span className="mc-credits-skip__image" style={{ left: scale, top: scale, width: (width + 4) * scale, height: (height + 4) * scale }}>
        <ClassicSkin asset={state.asset} width={width + 4} height={height + 4} scale={scale} baseClass="mc-credits-skip-skin" errorName="Credits Skip" />
      </span>
      <span className="mc-credits-skip__border" style={{ filter: `brightness(${state.border})` }}>
        <ClassicSkin asset={startMenuAssets.focusWhite} width={width + 6} height={height + 6} scale={scale} baseClass="mc-credits-skip-skin" errorName="Credits Skip" />
      </span>
      <span className="mc-credits-skip__label" style={{ left: 3 * scale, top: (state.name === 'pressed' ? 4 : 3) * scale, width: width * scale, height: height * scale }}>{line.runs.map((run, i) => renderRun(run, state.color, i))}</span>
    </span>)}
  </button>;
});
