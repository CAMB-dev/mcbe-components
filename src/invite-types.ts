/** Source-scoped Invite presentation types. Host providers and native layout remain external. */
import type { HTMLAttributes, InputHTMLAttributes, ButtonHTMLAttributes, Ref, ReactNode, SyntheticEvent } from 'react';
type LogicalSize = readonly [number, number];
import type { ImageSize } from './image';
import type { ClassicInputFontMode as FontMode } from './classic-input-font';
export type InviteIdentity = 'platform' | 'linked-account' | 'xbox-live';
export type InviteCollection = 'online_platform_friends' | 'online_linked_account_friends' | 'online_xbox_live_friends'
  | 'offline_platform_friends' | 'offline_linked_account_friends' | 'offline_xbox_live_friends';
export type InviteToggleName = 'toggle_platform_invite_online' | 'toggle_platform_invite_offline'
  | 'toggle_linked_account_invite_online' | 'toggle_linked_account_invite_offline'
  | 'toggle_xbox_live_invite_online' | 'toggle_xbox_live_invite_offline';
export type InviteCheckVisual = 'checked' | 'unchecked' | 'checked-hover' | 'unchecked-hover'
  | 'checked-locked' | 'unchecked-locked' | 'checked-locked-hover' | 'unchecked-locked-hover';
export interface InviteScope {
  readonly collection: InviteCollection;
  /** Stable identity inside this collection. Not a recovered MSA/platform account id. */
  readonly itemId: string;
  readonly collectionIndex: number;
}
export interface InviteFocusBindings {
  readonly up?: string;
  readonly down?: string;
  readonly profileIdentifier?: string;
}
export interface InviteRenderContext extends InviteScope {
  readonly identity: InviteIdentity;
  readonly scale: number;
  readonly logicalSize: LogicalSize;
  readonly enabled: boolean;
}
export type InviteProfileVisual = {
  readonly kind: 'image'; readonly src: string; readonly sourceSize: ImageSize;
  /** Original dynamic binding provenance; these are not paths for the library to open. */
  readonly nativeTexture?: unknown; readonly nativeFileSystem?: unknown;
} | {
  readonly kind: 'host-renderer';
  /** Synchronous, noninteractive content only. No renderer/provider is recovered. */
  readonly render: (context: InviteRenderContext) => ReactNode;
  readonly nativeProfileImageOptions?: unknown;
};
export type InvitePlatformIcons = { readonly visible: false } | {
  readonly visible: true;
  /** REQUIRED when source platform_icon is included/visible: canonical ZIP lacks it. */
  readonly render: (context: InviteRenderContext) => ReactNode;
  readonly provenance: 'host-supplied-missing-platform-icon';
};
interface InvitePersonCommon {
  readonly id: string;
  readonly currentGameLabel: string;
  /** #online_visible is independent of category online/offline naming. */
  readonly onlineVisible: boolean;
  /** Retained for the dormant offline_image helper; root online_indicator does not mount it. */
  readonly offlineVisible?: boolean;
  readonly focus?: InviteFocusBindings;
  /** Explicit host restriction; does not replace #cross_platform_enabled. */
  readonly enabled?: boolean;
}
export type InvitePerson = (InvitePersonCommon & {
  readonly identity: 'xbox-live'; readonly gamertag: string; readonly gamerpic: InviteProfileVisual;
}) | (InvitePersonCommon & {
  readonly identity: 'platform'; readonly thirdPartyTag: string; readonly thirdPartyProfile: InviteProfileVisual;
}) | (InvitePersonCommon & {
  readonly identity: 'linked-account'; readonly gamertag: string; readonly thirdPartyTag: string;
  readonly gamerpic: InviteProfileVisual; readonly thirdPartyProfile: InviteProfileVisual;
});
export interface InviteCapabilities {
  readonly isInvitingToRealm: boolean;
  readonly canManageMembers: boolean;
  readonly supportsAddFriend: boolean;
  readonly useVerticalButtonStackPanel: boolean;
  readonly isPs4: boolean;
  readonly xboxOne: boolean;
  readonly platformInvitesVisible: boolean;
  readonly usePagination: boolean;
  readonly hideErrorMessage: boolean;
  readonly platformIcons: InvitePlatformIcons;
}
export interface InviteBindings {
  readonly isLoading: boolean;
  readonly crossPlatformEnabled: boolean;
  readonly categoryVisible: Readonly<Record<InviteCollection, boolean>>;
  readonly noPlatformFriendsVisible: boolean;
  readonly noXboxLiveFriendsVisible: boolean;
  readonly noXboxLiveFriendsText: string;
  readonly findCrossPlatformFriendsEnabled: boolean;
  readonly sendButtonText: string;
  readonly gamepadHelperVisible: boolean;
  /** Inherited common.gamepad_helper_a #button_a_description. */
  readonly buttonADescription: string;
  readonly closeButtonVisible: boolean;
  readonly isPartySystemAvailable: boolean;
  readonly canInviteToParty: boolean;
}
export interface InvitePaginationSnapshot {
  readonly visible: boolean;
  readonly previousEnabled: boolean;
  readonly nextEnabled: boolean;
  readonly counterLabel: string;
}
export interface InviteCategoryData {
  readonly collection: InviteCollection;
  readonly people: readonly InvitePerson[];
  /** Host resolution of source grid_dimension_binding; never inferred from length. */
  readonly grid: { readonly columns: number; readonly rows: number };
  readonly pagination: InvitePaginationSnapshot;
  readonly ttsSectionHeader: string;
}
export interface InviteSelection {
  /** Composite keys; selected people on other pages are not discarded automatically. */
  readonly selected: readonly Pick<InviteScope, 'collection' | 'itemId'>[];
  readonly inviteToParty: boolean;
}
export type InviteActionTarget = 'button.add_friend' | 'button.add_member' | 'button.send_invites'
  | 'button.view_profile' | 'button.previous_friends_page' | 'button.next_friends_page' | 'button.menu_exit';
export type InviteActionDetail = {
  readonly target: 'button.add_friend' | 'button.add_member' | 'button.send_invites' | 'button.menu_exit';
  readonly origin: 'control' | 'escape' | 'host-controller'; readonly event?: SyntheticEvent<HTMLElement>;
} | {
  readonly target: 'button.previous_friends_page' | 'button.next_friends_page';
  readonly collection: InviteCollection; readonly origin: 'control' | 'host-controller'; readonly event?: SyntheticEvent<HTMLElement>;
} | (InviteScope & {
  readonly target: 'button.view_profile'; readonly origin: 'control' | 'host-controller'; readonly event?: SyntheticEvent<HTMLElement>;
});
export interface InviteSelectionDetail extends InviteScope {
  readonly selected: boolean;
  readonly toggleName: InviteToggleName;
  readonly sourceBinding: '#toggle_invite_state';
  /** Literal authoring is retained without asserting native common.toggle dispatch. */
  readonly authoredPressedButtonName: 'button.menu_friend_select';
  readonly origin: 'native-input' | 'host-controller';
  readonly event?: SyntheticEvent<HTMLInputElement>;
}
export interface InvitePartyDetail {
  readonly value: boolean;
  readonly toggleName: 'invite_to_party';
  readonly stateBinding: '#invite_to_party';
  readonly optionBinding: '#invite_to_party_binding';
  readonly origin: 'native-input' | 'host-controller';
  readonly event?: SyntheticEvent<HTMLInputElement>;
}
export type InviteControllerCommand = {
  readonly fromButtonId: 'button.menu_select' | 'button.menu_ok' | 'button.controller_select'
    | 'button.controller_secondary_select' | 'button.menu_cancel';
  /** Explicit host target avoids guessing focus or choosing between two visible add controls. */
  readonly destination: InviteActionTarget | 'friend-toggle' | 'party-toggle';
  readonly collection?: InviteCollection; readonly itemId?: string;
};
export interface InviteControllerHandle {
  /** Validates the original mapping, latest ownership, flags and explicit destination.
   * Returns false if unavailable/incompatible; performs no device polling or social IO. */
  request(command: InviteControllerCommand): boolean;
}
export interface InviteLabels {
  readonly title: string; readonly realmTitle: string;
  readonly onlinePlatform: string; readonly offlinePlatform: string;
  readonly onlineCrossPlatform: string; readonly offlineCrossPlatform: string;
  readonly noPlatformFriends: string; readonly crossPlatformDisabled: string;
  readonly partyTitle: string; readonly partyDescription: string;
  readonly addFriend: string; readonly addMember: string; readonly profile: string;
  readonly previousPage: string; readonly nextPage: string; readonly close: string;
  readonly friendSelection: (person: InvitePerson) => string;
  readonly loading: string; readonly scrollArea: string;
}
export interface InvitePresentation {
  /** Desktop/Pocket variable profile; not a browser media query or recovered native coordinates. */
  readonly sourceProfile: 'desktop' | 'pocket';
  readonly availableSize: LogicalSize;
  readonly scale: number;
  readonly inputMode: 'mouse' | 'touch';
  readonly touchThumbVisible: boolean;
  readonly minThumbSize?: number;
  /** Existing bounded Web font route only; does not recover native selector/glyph advances. */
  readonly fontMode?: FontMode;
}
type RootNativeProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'dangerouslySetInnerHTML' | 'title' | 'defaultValue' | 'onChange' | 'onSelect'>;
type SelectionNativeProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'checked' | 'defaultChecked' | 'disabled' | 'readOnly' | 'children' | 'dangerouslySetInnerHTML'>;
type ActionNativeProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'disabled' | 'children' | 'dangerouslySetInnerHTML'>;
export interface InvitePersonRowProps extends RootNativeProps {
  readonly scope: InviteScope; readonly person: InvitePerson; readonly width: number;
  readonly capabilities: Pick<InviteCapabilities, 'isInvitingToRealm' | 'isPs4' | 'xboxOne' | 'platformIcons'>;
  readonly crossPlatformEnabled: boolean;
  readonly selected?: boolean; readonly defaultSelected?: boolean;
  readonly onSelectedChange?: (detail: InviteSelectionDetail) => void;
  readonly labels: Pick<InviteLabels, 'profile' | 'friendSelection'>;
  readonly scale?: number; readonly disabled?: boolean; readonly readOnly?: boolean;
  readonly fontMode?: FontMode;
  readonly selectionRef?: Ref<HTMLInputElement>; readonly selectionProps?: SelectionNativeProps;
  readonly profileRef?: Ref<HTMLButtonElement>; readonly profileProps?: ActionNativeProps;
  readonly onAction?: (detail: InviteActionDetail) => void;
}
export interface InvitePaginationProps extends RootNativeProps {
  readonly collection: InviteCollection; readonly width: number;
  readonly included: boolean; readonly snapshot: InvitePaginationSnapshot;
  readonly previousLabel: string; readonly nextLabel: string;
  readonly scale?: number; readonly disabled?: boolean; readonly readOnly?: boolean;
  readonly fontMode?: FontMode;
  readonly previousRef?: Ref<HTMLButtonElement>; readonly nextRef?: Ref<HTMLButtonElement>;
  readonly previousProps?: ActionNativeProps; readonly nextProps?: ActionNativeProps;
  readonly onAction?: (detail: InviteActionDetail) => void;
}
export interface InviteCategoryProps extends RootNativeProps {
  readonly data: InviteCategoryData; readonly width: number; readonly visible: boolean;
  readonly selected?: InviteSelection['selected']; readonly defaultSelected?: InviteSelection['selected'];
  readonly capabilities: InviteCapabilities; readonly crossPlatformEnabled: boolean;
  readonly labels: Pick<InviteLabels, 'profile' | 'friendSelection' | 'previousPage' | 'nextPage'>;
  readonly scale?: number; readonly disabled?: boolean; readonly readOnly?: boolean;
  readonly fontMode?: FontMode;
  readonly paginationRef?: Ref<HTMLElement>;
  readonly rowRefs?: Readonly<Record<string, Ref<HTMLElement>>>;
  readonly selectionRefs?: Readonly<Record<string, Ref<HTMLInputElement>>>;
  readonly profileRefs?: Readonly<Record<string, Ref<HTMLButtonElement>>>;
  readonly onSelectedChange?: (detail: InviteSelectionDetail) => void;
  readonly onAction?: (detail: InviteActionDetail) => void;
}
export interface InviteFooterProps extends RootNativeProps {
  readonly width: number; readonly variant: 'horizontal' | 'vertical';
  readonly capabilities: Pick<InviteCapabilities, 'isInvitingToRealm' | 'canManageMembers' | 'supportsAddFriend'>;
  readonly findCrossPlatformFriendsEnabled: boolean; readonly sendButtonText: string;
  readonly gamepadHelperVisible: boolean;
  /** Host artwork is REQUIRED when helper-visible is true; no synthetic gamepad art. */
  readonly renderGamepadHelper?: (kind: 'a' | 'x' | 'y', context: { readonly label: string; readonly enabled: boolean; readonly scale: number;
    readonly sourceTextureBinding: '#controller_face_down_icon' | '#controller_face_left_icon' | '#controller_face_up_icon' }) => ReactNode;
  readonly labels: Pick<InviteLabels, 'addFriend' | 'addMember'>;
  readonly scale?: number; readonly disabled?: boolean; readonly readOnly?: boolean;
  readonly fontMode?: FontMode;
  readonly controlRefs?: Partial<Record<'addFriend' | 'addMember' | 'send', Ref<HTMLButtonElement>>>;
  readonly controlProps?: Partial<Record<'addFriend' | 'addMember' | 'send', ActionNativeProps>>;
  readonly onAction?: (detail: InviteActionDetail) => void;
}
export interface InviteScreenProps extends RootNativeProps {
  readonly presentation: InvitePresentation; readonly capabilities: InviteCapabilities;
  readonly bindings: InviteBindings;
  /** Exactly one snapshot per six original scopes; root preserves original order. */
  readonly categories: Readonly<Record<InviteCollection, InviteCategoryData>>;
  readonly labels: InviteLabels; readonly errorMessageText: string;
  readonly value?: InviteSelection; readonly defaultValue?: InviteSelection;
  readonly onSelectionChange?: (next: InviteSelection, detail: InviteSelectionDetail | InvitePartyDetail) => void;
  readonly onAction?: (detail: InviteActionDetail) => void;
  readonly renderGamepadHelper?: InviteFooterProps['renderGamepadHelper'];
  readonly open?: boolean; readonly visible?: boolean; readonly modal?: boolean;
  readonly disabled?: boolean; readonly readOnly?: boolean;
  readonly viewportRef?: Ref<HTMLDivElement>;
  readonly categoryRefs?: Partial<Record<InviteCollection, Ref<HTMLElement>>>;
  readonly paginationRefs?: Partial<Record<InviteCollection, Ref<HTMLElement>>>;
  readonly partyRef?: Ref<HTMLInputElement>; readonly partyProps?: SelectionNativeProps;
  readonly closeRef?: Ref<HTMLButtonElement>; readonly closeProps?: ActionNativeProps;
  readonly footerControlRefs?: InviteFooterProps['controlRefs'];
  readonly controllerRef?: Ref<InviteControllerHandle>;
}
// Public component contracts: InviteScreen, InvitePersonRow, InviteCategory,
// InvitePagination, InviteFooter. Existing primitives remain existing exports.
// Party/profile/link/status/check/background/loading/frame and dormant helper
// variants are private source-profile pieces, not more generic public controls.
