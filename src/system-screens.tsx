import { forwardRef, useId, useState } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { Button, Progress } from './components';
import { Spinner, Toast } from './feedback';
import type { ToastProps } from './feedback';
import { NavigationList } from './settings-controls';

const classes = (...values: (string | undefined | false)[]) => values.filter(Boolean).join(' ');

export interface SettingsSection {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  content: ReactNode;
}
export interface SettingsPanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'children' | 'defaultValue' | 'onChange'> {
  sections: readonly SettingsSection[];
  title?: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  navigationLabel?: string;
  headerActions?: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  emptyContent?: ReactNode;
}
/** Classic source composition. Hidden sections stay mounted so host drafts survive switching. */
export const SettingsPanel = forwardRef<HTMLElement, SettingsPanelProps>(function SettingsPanel({
  sections, title = 'Settings', value, defaultValue, onValueChange, navigationLabel = 'Settings sections',
  headerActions, footer, onBack, backLabel = 'Back', emptyContent, className, ...props
}, ref) {
  const id = useId(), [internal, setInternal] = useState(defaultValue);
  const values = new Set<string>();
  for (const section of sections) {
    if (!section.value || values.has(section.value)) throw new RangeError('Settings section values must be non-empty and unique.');
    values.add(section.value);
  }
  const requested = value ?? internal;
  const active = sections.find(section => section.value === requested && !section.disabled) ?? sections.find(section => !section.disabled);
  return <section {...props} ref={ref} aria-labelledby={props['aria-label'] ? undefined : props['aria-labelledby'] ?? `${id}-title`}
    className={classes('mc-settings-panel', className)} data-source="classic-settings-composition">
    <span className="mc-settings-panel__frame" aria-hidden="true"/>
    <header className="mc-settings-panel__header">
      {onBack && <Button className="mc-settings-panel__back" onClick={onBack}>{backLabel}</Button>}
      <h2 id={`${id}-title`} className="mc-settings-panel__title">{title}</h2>
      {headerActions && <div className="mc-settings-panel__actions">{headerActions}</div>}
    </header>
    <div className="mc-settings-panel__body">
      <div className="mc-settings-panel__navigation"><NavigationList label={navigationLabel} items={sections} value={active?.value}
        onValueChange={next => { if (next === active?.value || !sections.some(section => section.value === next && !section.disabled)) return;
          if (value === undefined) setInternal(next); onValueChange?.(next); }}/></div>
      <span className="mc-settings-panel__divider" aria-hidden="true"/>
      <div className="mc-settings-panel__content">
        {sections.map((section, index) => <section key={section.value} hidden={section !== active} aria-labelledby={`${id}-section-${index}`}
          className="mc-settings-panel__page" data-settings-section={section.value}>
          <h3 id={`${id}-section-${index}`} className="mc-settings-panel__section-title">{section.label}</h3>{section.content}
        </section>)}
        {!active && emptyContent}
      </div>
    </div>
    {footer && <footer className="mc-settings-panel__footer">{footer}</footer>}
  </section>;
});

export interface LoadingScreenProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> {
  title: string;
  message?: string;
  /** Native Classic world modal by default. Compact retains the smaller generic composition. */
  variant?: 'world-modal' | 'compact';
  /** Positive integer GUI scale; world-modal geometry and source atlases scale in integer pixels. */
  scale?: number;
  /** Undefined selects the source loading animation; finite values select a determinate bar. */
  value?: number;
  max?: number;
  showValue?: boolean;
  progressLabel?: string;
  onCancel?: () => void;
  cancelLabel?: string;
  cancelling?: boolean;
  /** Host artwork replaces the source background, including its gradient. Decorative only. */
  background?: ReactNode;
  backgroundVariant?: 'overworld' | 'classic' | 'transparent';
  /** Default is the original title PNG; null hides it. Host title art may replace it. */
  branding?: ReactNode;
  /** Optional static source loading_bar frame, 0–9, for the world-modal profile. */
  loadingFrame?: number;
  /** Optional static loading_spin frame, 0–9, for the compact profile. */
  spinnerFrame?: number;
  paused?: boolean;
}
/** An embeddable screen region: the host owns routing, focus and actual loading/cancellation. */
export const LoadingScreen = forwardRef<HTMLElement, LoadingScreenProps>(function LoadingScreen({
  title, message, variant = 'world-modal', scale = 2, value, max = 100, showValue, progressLabel = 'Loading progress', onCancel,
  cancelLabel = 'Cancel', cancelling = false, background, backgroundVariant, branding, loadingFrame, spinnerFrame, paused,
  className, style, ...props
}, ref) {
  if (!Number.isFinite(max) || max <= 0 || (value !== undefined && !Number.isFinite(value))) throw new RangeError('Loading progress requires a finite value and a positive finite max.');
  if (!Number.isSafeInteger(scale) || scale < 1) throw new RangeError('Loading scale must be a positive integer.');
  if (loadingFrame !== undefined && (!Number.isInteger(loadingFrame) || loadingFrame < 0 || loadingFrame > 9)) throw new RangeError('loadingFrame must be an integer from 0 to 9.');
  const id = useId(), determinate = value !== undefined, progress = determinate ? Math.max(0, Math.min(max, value)) : undefined;
  const world = variant === 'world-modal', percent = progress === undefined ? undefined : progress / max * 100;
  const backgroundType = background === undefined ? backgroundVariant ?? (world ? 'transparent' : 'overworld') : 'host';
  const showNumber = showValue ?? !world;
  const status = <div role="status" aria-live="polite" aria-atomic="true" className="mc-loading-screen__status">
    <h2 id={`${id}-title`}>{title}</h2>{message && <p>{message}</p>}
  </div>;
  const cancel = onCancel && <Button className="mc-loading-screen__cancel" disabled={cancelling} loading={cancelling} onClick={onCancel}>{cancelLabel}</Button>;
  return <section {...props} ref={ref} className={classes('mc-loading-screen', className)}
    aria-labelledby={props['aria-label'] ? undefined : props['aria-labelledby'] ?? `${id}-title`}
    aria-busy={progress === undefined || progress < max} data-source={world ? 'classic-world-modal-loading' : 'classic-progress-composition'} data-variant={variant} data-background={backgroundType}
    style={{'--mc-system-scale':scale,...style} as CSSProperties}>
    <div className="mc-loading-screen__background" aria-hidden="true">{background}</div>
    {world ? <>
      {branding !== null && <div className="mc-loading-screen__branding">{branding === undefined ? <span className="mc-loading-screen__title-image" role="img" aria-label="Minecraft"/> : branding}</div>}
      <div className="mc-loading-screen__world-panel">
        <span className="mc-loading-screen__world-wash" aria-hidden="true"/><span className="mc-loading-screen__world-frame" aria-hidden="true"/>
        {status}
        <div className="mc-loading-screen__world-inside">
          {showNumber && determinate && <div className="mc-loading-screen__value">{Math.round(percent!)}%</div>}
          <div className="mc-loading-screen__world-indicator">{determinate
            ? <div role="progressbar" aria-label={progressLabel} aria-valuemin={0} aria-valuemax={max} aria-valuenow={progress} className="mc-loading-screen__fancy-bar" data-source="experience-progress">
                <span className="mc-loading-screen__bar-empty" aria-hidden="true"/><span className="mc-loading-screen__bar-full" aria-hidden="true" style={{clipPath:`inset(0 ${100-percent!}% 0 0)`}}/><span className="mc-loading-screen__bar-nub" aria-hidden="true"/>
              </div>
            : <span className="mc-loading-screen__waveform" aria-hidden="true" data-source="loading-bar" data-loading-frame={loadingFrame} data-paused={paused||undefined}>
                <span style={loadingFrame === undefined ? undefined : {backgroundPositionX:-loadingFrame*64*scale,animation:'none'}}/>
              </span>}</div>
          <div className="mc-loading-screen__world-buttons">{cancel}</div>
        </div>
      </div>
    </> : <div className="mc-loading-screen__content">
      {status}
      <div className="mc-loading-screen__indicator">{determinate
        ? <Progress label={progressLabel} value={progress} max={max} showValue={showNumber}/>
        : <Spinner decorative scale={scale} frame={spinnerFrame} paused={paused}/>}</div>
      {cancel}
    </div>}
  </section>;
});

export interface AchievementToastProps extends Omit<ToastProps, 'icon' | 'action' | 'variant'> {
  /** Host achievement artwork; omitted means no invented/default trophy. */
  achievementIcon?: ReactNode;
  announcementLabel?: string;
}
/** Source toast skin with host achievement data. Keep mounted; timing is opt-in and pausable. */
export const AchievementToast = forwardRef<HTMLDivElement, AchievementToastProps>(function AchievementToast({
  title, achievementIcon, announcementLabel = 'Achievement unlocked', dismissLabel = 'Dismiss achievement', className, ...props
}, ref) {
  return <Toast {...props} ref={ref} className={classes('mc-achievement-toast', className)} title={announcementLabel ? `${announcementLabel}: ${title}` : title}
    icon={achievementIcon} dismissLabel={dismissLabel} data-source="classic-achievement-toast-composition"/>;
});
