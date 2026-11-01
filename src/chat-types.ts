/** Host-owned Chat data. UI services, native shader/font routing and engine providers are not inferred. */
import type { HTMLAttributes, InputHTMLAttributes, Ref, ReactNode, SyntheticEvent } from 'react';
export type ChatSize = readonly [number, number];
export interface ChatWholeImage { readonly src: string; readonly naturalSize: ChatSize; readonly provenance: string }
export interface ChatColorRun { readonly text:string; readonly color:string }
export interface ChatMessageRecord { readonly id: string; readonly text: string; readonly ttsText: string; readonly colorRuns?:readonly ChatColorRun[] }
export interface ChatSuggestion {
  readonly id: string; readonly text: string; readonly itemIdAux: unknown;
  /** Only this9x9 leaf is unrecovered; never an injected list/panel/Screen. */
  readonly itemVisual: { readonly kind: 'none' } | { readonly kind: 'whole-image'; readonly image: ChatWholeImage }
    | { readonly kind: 'host-item-renderer'; readonly render: (context: { readonly size: readonly [9,9]; readonly scale: number; readonly itemIdAux: unknown }) => ReactNode };
  readonly isSuggestion: boolean; // false keeps text/item; only click button is absent
}
export interface ChatCoordinates {
  readonly visible: boolean; readonly dropdownLabel: string; readonly text: string; readonly copyEnabled: boolean;
  readonly positionSelected: boolean; readonly facingSelected: boolean;
}
export interface ChatTypefaceChoice { readonly selected: boolean; readonly label: string }
export interface ChatColorChoice { readonly label: string; readonly color: string; readonly selected: boolean }
export type ChatSevenColors = readonly [ChatColorChoice,ChatColorChoice,ChatColorChoice,ChatColorChoice,ChatColorChoice,ChatColorChoice,ChatColorChoice];
/** min/max/step are explicit Web resolution; steps is independent source metadata. */
export interface ChatSliderState { readonly value:number; readonly enabled:boolean; readonly min:number; readonly max:number; readonly step:number; readonly steps:number; readonly label:string; readonly valueText:string }
export interface ChatSettingsState {
  readonly popup: null | { readonly instanceId: string; readonly closeButtonVisible: boolean };
  readonly hideChat: boolean; readonly muteEmotes: boolean; readonly tts: boolean;
  readonly typefaceVisibleAtInstanceCreation: boolean; readonly typefaceEnabled: boolean; readonly typefaceLabel: string;
  readonly mojangles: ChatTypefaceChoice; readonly notoSans: ChatTypefaceChoice;
  readonly fontSize: ChatSliderState; readonly lineSpacing: ChatSliderState;
  readonly chatColors: ChatSevenColors; readonly mentionsColors: ChatSevenColors;
  readonly chatColorEnabled: boolean; readonly mentionsColorEnabled: boolean;
  readonly chatColorLabel: string; readonly mentionsColorLabel: string;
  readonly chatPaintbrushColor: string; readonly mentionsPaintbrushColor: string;
}
export type ChatHostCollection = 'host_main_collection'|'host_teleport_collection'|'host_time_collection'|'host_weather_collection'|'players_collection';
export interface ChatHostEntry {
  readonly id: string; readonly text: string; readonly navigation: unknown; readonly subCommand: unknown;
  readonly glyph: null | ChatWholeImage; readonly glyphVisible: boolean;
  readonly focusId: string; readonly focus: { readonly up: string; readonly down: string; readonly left: string; readonly right: string };
  readonly teleportVisible: boolean; readonly toggleSelected: boolean; readonly teleportName: string;
}
export interface ChatHostPlayer extends ChatHostEntry {
  readonly gamertag: string;
  readonly gamerPicture: { readonly visible:boolean; readonly image?:ChatWholeImage; readonly nativeFileSystem?:unknown; readonly nativeTexture?:unknown };
  readonly localPlayerIconVisible: boolean;
  readonly platformIcon: { readonly visible:boolean; readonly image?:ChatWholeImage };
}
export interface ChatHostGrid<T> { readonly dimensions: ChatSize; readonly entries: readonly T[] }
export interface ChatHostState {
  readonly cheatsOn: boolean;
  readonly mainVisible: boolean; readonly teleportMainVisible: boolean; readonly teleportPlayersVisible: boolean;
  readonly timeVisible: boolean; readonly weatherVisible: boolean;
  readonly main: ChatHostGrid<ChatHostEntry>; readonly teleport: ChatHostGrid<ChatHostEntry>;
  readonly time: ChatHostGrid<ChatHostEntry>; readonly weather: ChatHostGrid<ChatHostEntry>;
  readonly players: ChatHostGrid<ChatHostPlayer>;
}
export interface ChatBindings {
  readonly chatVisible: boolean; readonly titleVisible: boolean; readonly title: string;
  readonly backText: string; readonly backAccessibilityText: string;
  readonly editorEnabled: boolean; readonly sendEnabled: boolean; // source #send_button_visible -> #enabled
  readonly sendAccessibilityText: string;
  readonly keyboardButtonVisible: boolean; readonly keyboardInUse: boolean;
  readonly hasNewMessages: boolean; readonly forceScrollToBottom: boolean;
  readonly messageTtsFocusEnabled: boolean; // #host_options_menu_not_open_and_tts_enabled
  readonly gamepadHelperVisible: boolean; readonly usingGamepad: boolean;
  readonly focus: Readonly<Record<'editorUp'|'editorDown'|'keyboardUp'|'keyboardDown', string>>;
}
export interface ChatCapabilities { readonly sourceProfile: 'desktop'|'pocket'; readonly touch: boolean; readonly isPregame: boolean; readonly educationEdition: boolean; readonly platformIconsVisible: boolean }
export interface ChatFontSpec { readonly family: string; readonly logicalSize: number; readonly lineHeight: number }
export interface ChatPresentationProfile {
  readonly availableSize: ChatSize; readonly scale: number;
  readonly fonts: { readonly chat: ChatFontSpec; readonly editor: ChatFontSpec; readonly chrome: ChatFontSpec; readonly smooth: ChatFontSpec };
  readonly chatFontScaleFactor: number; readonly chatLinePadding: number;
  readonly messageLive:'off'|'polite';
  readonly messageShadow: boolean; // source message label omits shadow
  readonly maxTextEditLength: number; // required $max_text_edit_length resolution; not common14
  readonly maxLengthPolicy: 'web-utf16'; readonly sourceGeometry: 'finite-parent-percent-intrinsic-web-profile';
  readonly labels: Readonly<Record<string, string>>; // keyed authored localization IDs retained in ledger
  /** Exact White is missing; require a whole host material, no drawn substitute. */
  readonly whiteMaterial: ChatWholeImage & { readonly sourceTexture: 'textures/ui/White' };
  readonly gamepadImages: Readonly<Record<'b'|'x'|'y',ChatWholeImage>>;
  readonly inputPolicy: { readonly submit: 'web-enter'|'host-only'; readonly history: 'web-arrows'|'host-only'; readonly autocomplete: 'host-logical-only'; readonly escape: 'topmost-layer'; readonly repeat: 'ignore'|'accept' };
}
export interface ChatDraft { readonly text: string; readonly selectionStart: number; readonly selectionEnd: number; readonly direction: 'forward'|'backward'|'none'; readonly revision: string }
export type ChatActionTarget = 'button.send'|'button.keyboard_toggle'|'button.open_chat_settings'|'button.new_messages'
 |'button.chat_autocomplete'|'button.chat_autocomplete_back'|'button.chat_previous_message'|'button.chat_next_message'
 |'button.click_autocomplete'|'button.chat_paste_coordinates'|'copy_coordinates_button'|'paste_button'
 |'button.chat_menu_cancel'|'button.close_chat_settings'|'button.reset_chat_settings'
 |'button.host_toggle'|'button.host_main'|'button.menu_navigation'|'button.sub_command'|'button.teleport_clear'
 |'button.text_edit_box_selected'|'button.text_edit_box_deselected'|'button.text_edit_box_hovered'|'button.text_edit_box_clear';
export interface ChatActionDetail {
  readonly target: ChatActionTarget; readonly origin: 'control'|'keyboard'|'host-controller';
  readonly control: HTMLElement; readonly event?: SyntheticEvent<HTMLElement>;
  readonly runKey:string; readonly rawDraft: ChatDraft; readonly coordinatesText: string;
  readonly fromButtonId?:ChatControllerCommand['fromButtonId'];
  readonly suggestion?: { readonly id: string; readonly index: number; readonly itemIdAux: unknown };
  readonly hostEntry?: { readonly collection: ChatHostCollection; readonly id: string; readonly index: number; readonly navigation: unknown; readonly subCommand: unknown };
}
export type ChatSettingChange = { readonly kind: 'boolean'; readonly field: 'hide_chat'|'toggle_emote_chat'|'toggle_tts'; readonly value: boolean }
 |{readonly kind:'typeface';readonly field:'typeface_radio_mojangles'|'typeface_radio_notoSans';readonly value:boolean}
 |{readonly kind:'slider';readonly field:'chat_font_size'|'chat_line_spacing';readonly value:number}
 |{readonly kind:'color';readonly field:'chat'|'mentions';readonly index:0|1|2|3|4|5|6;readonly value:boolean};
export interface ChatControllerCommand {
  readonly fromButtonId: 'button.menu_select'|'button.menu_ok'|'button.menu_exit'|'button.menu_cancel'|'button.menu_clear'
    |'button.menu_autocomplete'|'button.menu_autocomplete_back'|'button.menu_textedit_up'|'button.menu_textedit_down'
    |'button.controller_select'|'button.controller_start'|'button.controller_autocomplete'|'button.controller_autocomplete_back'
    |'button.controller_textedit_up'|'button.controller_textedit_down'|'button.controller_secondary_select';
  readonly destination: 'screen'|'editor'|'send'|'keyboard'|'settings'|'settings-close'|'settings-reset'|'new-messages'|'copy-coordinates'|'paste'|'host-toggle'|'host-return'
    |{readonly kind:'suggestion';readonly id:string}
    |{readonly kind:'coordinate-choice';readonly field:'position'|'facing'}
    |{readonly kind:'setting';readonly field:'hide_chat'|'toggle_emote_chat'|'toggle_tts'|'typeface_radio_mojangles'|'typeface_radio_notoSans'|'chat_font_size'|'chat_line_spacing'}
    |{readonly kind:'color-choice';readonly field:'chat'|'mentions';readonly index:0|1|2|3|4|5|6}
    |{readonly kind:'host';readonly collection:ChatHostCollection;readonly id:string};
}
export interface ChatControllerHandle { request(command:ChatControllerCommand):boolean; notifyPlayerHurt():boolean; focusEditor():boolean }
/** Only source editor logical input IDs; no invented hardware keys or clear/select targets. */
export type ChatEditorInput = 'button.menu_select'|'button.menu_ok'|'button.menu_cancel'|'button.menu_clear'
  |'button.menu_autocomplete'|'button.menu_autocomplete_back'|'button.menu_textedit_up'|'button.menu_textedit_down'
  |'button.controller_select'|'button.controller_start'|'button.controller_autocomplete'|'button.controller_autocomplete_back'
  |'button.controller_textedit_up'|'button.controller_textedit_down'|'button.controller_secondary_select';
export interface ChatEditorCommand {readonly fromButtonId:ChatEditorInput}
export type ChatComposerActionTarget = 'button.send'|'button.keyboard_toggle'|'button.open_chat_settings'|'button.host_toggle'
  |'button.chat_autocomplete'|'button.chat_autocomplete_back'|'button.chat_previous_message'|'button.chat_next_message'|'button.chat_paste_coordinates'
  |'button.text_edit_box_selected'|'button.text_edit_box_deselected'|'button.text_edit_box_hovered'|'button.text_edit_box_clear';
export interface ChatComposerActionDetail {
  readonly runKey:string;readonly target:ChatComposerActionTarget;readonly origin:'control'|'keyboard'|'host-controller';
  readonly control:HTMLElement;readonly event?:SyntheticEvent<HTMLElement>;readonly rawDraft:ChatDraft;readonly fromButtonId?:ChatEditorInput;
}
export interface ChatDraftApplication {
  readonly expectedRunKey:string;readonly expectedRevision:string;
  readonly text:string;readonly selectionStart:number;readonly selectionEnd:number;readonly direction:ChatDraft['direction'];readonly revision:string;
}
export interface ChatComposerHandle {
  getDraft():ChatDraft;focusEditor():boolean;request(command:ChatEditorCommand):boolean;
  /** Controlled mode only notifies onDraftChange; it does not accept/mutate the controlled value. */
  applyDraft(application:ChatDraftApplication):boolean;
}
export type ChatTextRole='message'|'suggestion'|'coordinate'|'title'|'settings-label'|'host-label'|'toast'|'chrome';
export interface ChatTextRenderContext {readonly role:ChatTextRole;readonly font:ChatFontSpec;readonly scale:number;readonly color:string;readonly shadow:boolean;readonly id?:string}
/** Glyph-only output. Never used for native editor text or whole content. */
export type ChatTextRenderer=(text:string,context:ChatTextRenderContext)=>ReactNode;
export type ChatInputProps=Omit<InputHTMLAttributes<HTMLInputElement>,'type'|'value'|'defaultValue'|'maxLength'|'disabled'|'children'|'dangerouslySetInnerHTML'> & {readonly children?:never;readonly dangerouslySetInnerHTML?:never};
export type ChatDraftChange=(next:ChatDraft,event?:SyntheticEvent<HTMLInputElement>)=>void;
export type ChatDraftMode = {readonly mode:'controlled';readonly draft:ChatDraft;readonly defaultDraft?:never;readonly onDraftChange:ChatDraftChange;readonly historyPolicy:'host-requests'}
  |{readonly mode:'uncontrolled-web';readonly defaultDraft:string;readonly draft?:never;readonly onDraftChange?:ChatDraftChange;readonly historyPolicy:'host-requests'|'local-oldest-first-web'};
type ChatDivNative=Omit<HTMLAttributes<HTMLDivElement>,'children'|'dangerouslySetInnerHTML'|'onChange'|'defaultValue'>;
interface ChatComposerCommon extends ChatDivNative {
  readonly children?:never;readonly dangerouslySetInnerHTML?:never;
  readonly runKey:string;readonly cheatsOn:boolean;readonly history:readonly string[];readonly bindings:ChatBindings;readonly capabilities:ChatCapabilities;readonly profile:ChatPresentationProfile;
  readonly disabled?:boolean;readonly readOnly?:boolean;readonly renderText?:ChatTextRenderer;
  readonly onAction:(detail:ChatComposerActionDetail)=>void|false;
  readonly inputRef?:Ref<HTMLInputElement>;readonly composerRef?:Ref<ChatComposerHandle>;readonly inputProps?:ChatInputProps;
}
export type ChatComposerProps=ChatComposerCommon&ChatDraftMode;
export interface ChatTranscriptScrollState {readonly runKey:string;readonly scrolledToEnd:boolean;readonly scrollTop:number;readonly maxScrollTop:number}
export interface ChatTranscriptProps extends ChatDivNative {
  readonly children?:never;readonly dangerouslySetInnerHTML?:never;
  readonly runKey:string;readonly messages:readonly ChatMessageRecord[];readonly bindings:ChatBindings;readonly profile:ChatPresentationProfile;
  readonly maxChildren:100;readonly overflowPolicy:'reject'|'last100-explicit-web';readonly renderText?:ChatTextRenderer;
  readonly onScrollStateChange?:(state:ChatTranscriptScrollState)=>void;
  readonly viewportRef?:Ref<HTMLDivElement>;
}
type ChatRootNative=Omit<HTMLAttributes<HTMLElement>,'children'|'dangerouslySetInnerHTML'|'onChange'|'defaultValue'>;
interface ChatScreenCommon extends ChatRootNative {
  readonly children?:never;readonly dangerouslySetInnerHTML?:never;
  readonly runKey:string;readonly open:boolean;readonly disabled?:boolean;readonly readOnly?:boolean;
  readonly messages:readonly ChatMessageRecord[];readonly maxChildren:100;readonly overflowPolicy:'reject'|'last100-explicit-web';
  readonly suggestions:readonly ChatSuggestion[];readonly suggestionGridDimensions:ChatSize;
  readonly coordinates:ChatCoordinates;readonly settings:ChatSettingsState;readonly host:ChatHostState;
  readonly bindings:ChatBindings;readonly capabilities:ChatCapabilities;readonly profile:ChatPresentationProfile;
  readonly history:readonly string[];readonly renderText?:ChatTextRenderer;readonly inputProps?:ChatInputProps;
  readonly onAction:(detail:ChatActionDetail)=>void|false;
  readonly onSettingChange:(change:ChatSettingChange)=>void;
  readonly onCoordinateChange:(field:'coordinate_type_position'|'coordinate_type_facing',value:boolean)=>void;
  readonly onHostSelectionChange:(detail:{readonly collection:ChatHostCollection;readonly id:string;readonly selected:boolean})=>void;
  readonly onCloseRequested:(detail:{readonly reason:'chat-menu-cancel';readonly action:ChatActionDetail}|{readonly reason:'player-hurt';readonly sourceProperty:'close_on_player_hurt'})=>void;
  readonly toast:null|{readonly instanceId:string;readonly title:string};
  readonly controllerRef?:Ref<ChatControllerHandle>;readonly composerRef?:Ref<ChatComposerHandle>;readonly inputRef?:Ref<HTMLInputElement>;readonly messageViewportRef?:Ref<HTMLDivElement>;
}
export type ChatScreenProps=ChatScreenCommon&ChatDraftMode;

/** Private model outputs keep opaque host payloads by identity. They are never
 * stringified, invoked, traversed, or recursively frozen by snapshotting. */
export interface ChatDraftModeSnapshot {
  readonly mode:ChatDraftMode['mode'];readonly historyPolicy:ChatDraftMode['historyPolicy'];
  readonly draft?:ChatDraft;readonly defaultDraft?:string;
}
export interface ChatRootRefs {readonly controllerRef?:Ref<ChatControllerHandle>;readonly composerRef?:Ref<ChatComposerHandle>;readonly inputRef?:Ref<HTMLInputElement>;readonly messageViewportRef?:Ref<HTMLDivElement>}
export interface ChatScreenSnapshot {
  readonly runKey:string;readonly open:boolean;readonly disabled:boolean;readonly readOnly:boolean;
  readonly messages:readonly ChatMessageRecord[];readonly maxChildren:100;readonly overflowPolicy:ChatTranscriptProps['overflowPolicy'];
  readonly suggestions:readonly ChatSuggestion[];readonly suggestionGridDimensions:ChatSize;
  readonly coordinates:ChatCoordinates;readonly settings:ChatSettingsState;readonly host:ChatHostState;
  readonly bindings:ChatBindings;readonly capabilities:ChatCapabilities;readonly profile:ChatPresentationProfile;
  readonly draftMode:ChatDraftModeSnapshot;readonly history:readonly string[];readonly toast:ChatScreenCommon['toast'];
  readonly refs:ChatRootRefs;readonly inputProps?:ChatInputProps;
  readonly callbacks:{readonly onDraftChange?:ChatDraftChange;readonly onAction:ChatScreenCommon['onAction'];readonly onSettingChange:ChatScreenCommon['onSettingChange'];
    readonly onCoordinateChange:ChatScreenCommon['onCoordinateChange'];readonly onHostSelectionChange:ChatScreenCommon['onHostSelectionChange'];readonly onCloseRequested:ChatScreenCommon['onCloseRequested'];readonly renderText?:ChatTextRenderer};
}
export interface ChatLocalHistoryState {readonly index:number|null;readonly restoreDraft:ChatDraft|null;readonly history:readonly string[]}
export interface ChatHistoryTransition {readonly state:ChatLocalHistoryState;readonly draft:ChatDraft;readonly changed:boolean}
export type ChatDraftApplicationResult={readonly accepted:false;readonly reason:'run-key-mismatch'|'revision-mismatch'}|{readonly accepted:true;readonly draft:ChatDraft};

/** Private literal source mapping metadata; omitted flags stay omitted. */
export interface ChatEditorMapping {readonly fromButtonId?:ChatEditorInput;readonly target:ChatComposerActionTarget;readonly rawTarget:string;readonly mappingType:'pressed'|'global'|'focused';readonly handleSelect?:boolean;readonly handleDeselect?:boolean;readonly consumeEvent?:boolean}

export interface ChatComposerSnapshot {
  readonly runKey:string;readonly cheatsOn:boolean;readonly disabled:boolean;readonly readOnly:boolean;
  readonly bindings:ChatBindings;readonly capabilities:ChatCapabilities;readonly profile:ChatPresentationProfile;
  readonly draftMode:ChatDraftModeSnapshot;readonly history:readonly string[];readonly inputProps?:ChatInputProps;
  readonly refs:{readonly inputRef?:Ref<HTMLInputElement>;readonly composerRef?:Ref<ChatComposerHandle>};
  readonly callbacks:{readonly onDraftChange?:ChatDraftChange;readonly onAction:ChatComposerCommon['onAction'];readonly renderText?:ChatTextRenderer};
}
