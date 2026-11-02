import type {ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode, Ref, SyntheticEvent} from 'react';

export interface DisconnectButtonState {
  readonly label: string;
  readonly visible: boolean;
  readonly enabled: boolean;
}
export type DisconnectVariant = 'disconnect' | 'realms-disconnect' | 'realms-warning';
export type DisconnectButtonKind = 'ok' | 'back' | 'continue' | 'store' | 'open-account' | 'cancel';
export type DisconnectActionsModel =
  | {readonly variant: 'disconnect'; readonly ok: DisconnectButtonState; readonly openAccount: DisconnectButtonState}
  | {readonly variant: 'realms-disconnect'; readonly back: DisconnectButtonState; readonly store: DisconnectButtonState;
      readonly storeIgnored: boolean; readonly openAccount: DisconnectButtonState}
  | {readonly variant: 'realms-warning'; readonly continue: DisconnectButtonState; readonly store: DisconnectButtonState;
      readonly storeIgnored: boolean; readonly cancel: DisconnectButtonState};
/** Explicit Web choices for engine defaults/intrinsics not recovered from JSON. */
export interface DisconnectLayout {
  readonly size: readonly [number, number];
  readonly scale: number;
  readonly hiddenSlots: 'reserve' | 'collapse';
  readonly rowAlignment: 'left' | 'center';
  readonly uriButtonAnchor: 'top-center' | 'center';
  readonly textAlignment: 'left' | 'center';
  readonly textVerticalAlignment: 'top' | 'center';
  /** Font metrics in logical units; source label max boxes remain independent. */
  readonly font: {readonly family: string; readonly size: number; readonly lineHeight: number};
}
export interface DisconnectBackgroundProfile {
  readonly renderer: 'css' | 'gpu';
  readonly sampling: 'point' | 'bilinear';
  /** Explicit first tile origin, each component in [-32,0] logical units. */
  readonly tileOrigin: readonly [number, number];
  readonly originRounding: 'floor' | 'truncate';
}
export type DisconnectAction = 'leave' | 'continue' | 'check-store' | 'open-account-help' | 'cancel-realm-join';
export type DisconnectButtonId = 'button.menu_leave_screen' | 'button.menu_continue' | 'button.menu_check_store'
  | 'button.menu_open_uri' | 'button.cancel_join_realm';
export interface DisconnectActionDetail {
  readonly action: DisconnectAction;
  readonly buttonId: DisconnectButtonId;
  readonly variant: DisconnectVariant;
  readonly source: 'button' | 'menu-cancel';
  readonly button: DisconnectButtonKind | null;
  readonly event?: SyntheticEvent<HTMLElement>;
  /** Source hyperlink intent only; the component never opens a browser. */
  readonly uri?: 'https://aka.ms/MCMultiplayerHelp';
}
export type DisconnectNativeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'disabled' | 'hidden' | 'type'>;
export interface DisconnectActionsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onChange'> {
  /** Native inert, including the React18 attribute compatibility path. */
  readonly inert?: boolean;
  readonly layout: DisconnectLayout;
  readonly model: DisconnectActionsModel;
  readonly disabled?: boolean;
  readonly onAction?: (detail: DisconnectActionDetail) => void;
  readonly buttonProps?: Readonly<Partial<Record<DisconnectButtonKind, DisconnectNativeButtonProps>>>;
  readonly buttonRefs?: Readonly<Partial<Record<DisconnectButtonKind, Ref<HTMLButtonElement>>>>;
}
export interface DisconnectMessageProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  readonly inert?: boolean;
  readonly layout: DisconnectLayout;
  readonly title: string;
  readonly body: string;
}
export interface DisconnectControllerHandle {
  /** Logical source mapping; no physical gamepad API or platform inference. */
  request(command: 'button.menu_cancel'): boolean;
}
/** Host-resolved controller helper geometry/glyph content; no platform inference. */
export interface DisconnectInputHint {
  readonly visible: boolean;
  readonly box: readonly [number, number, number, number];
  readonly content: ReactNode;
}
export interface DisconnectScreenProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'title'> {
  readonly inert?: boolean;
  readonly label: string;
  readonly title: string;
  readonly body: string;
  readonly layout: DisconnectLayout;
  readonly actions: DisconnectActionsModel;
  /** Host-resolved safe-zone content rectangle in whole-frame logical units.
   * Background remains on the complete no-safe-zone frame. */
  readonly contentRect: readonly [number, number, number, number];
  readonly background: DisconnectBackgroundProfile;
  readonly disabled?: boolean;
  readonly menuCancelEnabled?: boolean;
  /** Opt-in Web focus containment/return and background inertness. */
  readonly modal?: boolean;
  readonly onAction?: (detail: DisconnectActionDetail) => void;
  readonly controllerRef?: Ref<DisconnectControllerHandle>;
  readonly inputHint?: DisconnectInputHint;
  readonly buttonProps?: DisconnectActionsProps['buttonProps'];
  readonly buttonRefs?: DisconnectActionsProps['buttonRefs'];
}
export interface DisconnectSnapshot {
  readonly layout: DisconnectLayout;
  readonly model: DisconnectActionsModel;
}
/** Internal rendering geometry, derived from source sizes and explicit choices. */
export interface DisconnectPlannedButton {
  readonly kind: DisconnectButtonKind;
  readonly state: DisconnectButtonState;
  readonly box: readonly [number, number, number, number];
}
export interface DisconnectActionsPlan extends DisconnectSnapshot {
  readonly buttons: readonly DisconnectPlannedButton[];
  readonly frameSize: readonly [number, number];
  readonly style: CSSProperties;
}
