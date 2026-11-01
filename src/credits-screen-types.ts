import type { HTMLAttributes, Ref, SyntheticEvent } from 'react';
import type { CreditsContent, CreditsLayoutBindings, CreditsLayoutProfile, CreditsRollPlan, CreditsTextStyle, CreditsWholeImage } from './credits-types';
import type { CreditsRollProps } from './credits-roll';

export interface CreditsSurfaceProfile {
  /** Whole host-supplied source image. No generated dirt or native shader is bundled. */
  readonly background: {
    readonly image: CreditsWholeImage;
    readonly tileSize: readonly [number, number];
    readonly logicalSize: readonly [number, number];
    readonly from: readonly [number, number];
    readonly to: readonly [number, number];
    readonly durationMs: number;
  };
  readonly edgeMask: { readonly kind: 'none' } | { readonly kind: 'whole-image'; readonly image: CreditsWholeImage };
  /** JSON authors a black White-texture cover. A DOM solid is an explicit Web substitute. */
  readonly coverPlacement: 'below-content' | 'above-content';
}
export interface CreditsPresentationProfile {
  readonly id: string;
  readonly evidenceId: string;
  readonly layout: CreditsLayoutProfile;
  readonly plan: CreditsRollPlan;
  readonly surface: CreditsSurfaceProfile;
  readonly logicalUnitsPerSecond: number;
  readonly fasterMultiplier: number;
  readonly skipLabelStyle: CreditsTextStyle;
  readonly rasterPositioning: CreditsRollProps['rasterPositioning'];
  readonly imageSampling: CreditsRollProps['imageSampling'];
  /** Engine orchestration was not recovered: this opts into the finite Web sequence. */
  readonly completion: 'web-scroll-end-then-fade';
  readonly input: {
    /** This is an explicit Web routing policy, supported only by the measured Settings entry. */
    readonly escape: 'reveal-then-exit' | 'reveal-only' | 'none';
    readonly enter: 'reveal-skip' | 'none';
    readonly repeat: 'ignore' | 'accept';
    readonly focus: 'host' | 'web-modal';
  };
}
export interface CreditsFactorySnapshot {
  readonly skipPanel: null | {
    readonly instanceId: string;
    /** Destroying the child does not remove the parent's cancel input. */
    readonly button: null | { readonly generation: string; readonly ageMs: number };
    readonly exitInputActive: boolean;
  };
  readonly fadeOut: null | { readonly instanceId: string; readonly ageMs: number };
}
export interface CreditsScreenSnapshot {
  readonly introAgeMs: number;
  readonly backgroundElapsedMs: number;
  readonly skipButtonVisible: boolean;
  readonly factory: CreditsFactorySnapshot;
}
export interface CreditsActionDetail {
  readonly runKey: string;
  readonly target: 'button.show_skip' | 'button.menu_exit';
  readonly origin: 'keyboard' | 'skip-button' | 'host-controller';
  readonly control: HTMLElement;
  readonly event?: SyntheticEvent<HTMLElement>;
  readonly panelInstanceId: string | null;
  readonly buttonGeneration: string | null;
}
export type CreditsLifecycleDetail = { readonly runKey: string } & (
  | { readonly kind: 'scroll_end'; readonly offset: number; readonly completionOffset: number }
  | { readonly kind: 'destroy-skip-child'; readonly panelInstanceId: string; readonly buttonGeneration: string }
  | { readonly kind: 'credits_end'; readonly fadeOutInstanceId: string }
);
export interface CreditsControllerCommand {
  readonly fromButtonId: 'button.menu_select' | 'button.menu_ok' | 'button.menu_cancel';
  /** Explicit destination avoids inventing priority between the JSON global mappings. */
  readonly destination: 'whole-screen' | 'skip-panel-input' | 'skip-button';
}
export interface CreditsControllerHandle { request(command: CreditsControllerCommand): boolean }
interface CreditsScreenCommon extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'content' | 'dangerouslySetInnerHTML' | 'onError'> {
  /** Change to begin a new run. Content/profile changes alone preserve playback. */
  readonly runKey: string;
  readonly content: CreditsContent;
  readonly profile: CreditsPresentationProfile;
  readonly bindings: CreditsLayoutBindings & { readonly scrollFaster: boolean };
  readonly scale: number;
  readonly skipLabel: string;
  readonly disabled?: boolean;
  readonly open?: boolean;
  readonly controllerRef?: Ref<CreditsControllerHandle>;
  readonly viewportRef?: CreditsRollProps['viewportRef'];
  readonly skipRef?: Ref<HTMLButtonElement>;
  readonly bitmapRenderer?: CreditsRollProps['bitmapRenderer'];
  readonly onRenderError?: CreditsRollProps['onRenderError'];
  /** false vetoes the high-level reveal or close request after native propagation. */
  readonly onAction?: (detail: CreditsActionDetail) => void | false;
  readonly onLifecycle?: (detail: CreditsLifecycleDetail) => void;
  /** Navigation belongs to the host; this component never closes a native window. */
  readonly onCloseRequested: (detail: CreditsActionDetail) => void;
}
export interface CreditsPlaybackScreenProps extends CreditsScreenCommon {
  readonly mode?: 'playback';
  readonly playback: { readonly playing: boolean; readonly initialOffset: number; readonly hiddenPolicy: 'pause' | 'continue' };
}
export interface CreditsControlledScreenProps extends CreditsScreenCommon {
  readonly mode: 'controlled-source';
  readonly position: { readonly offset: number; readonly elapsedMs: number };
  readonly snapshot: CreditsScreenSnapshot;
}
export type CreditsScreenProps = CreditsPlaybackScreenProps | CreditsControlledScreenProps;
