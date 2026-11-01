import type { CSSProperties, HTMLAttributes, ReactNode, Ref, SyntheticEvent } from 'react';

/** Controlled source-family model. All geometry/font policies are explicit Web inputs. */
export type ProgressSize = readonly [number, number];
export type ProgressRoute = 'progress_screen'|'modal_progress_screen'|'delete_progress_screen'|'realms_stories_loading_progress_screen'
 |'world_loading_progress_screen'|'experience_world_loading_progress_screen'|'overworld_loading_progress_screen'|'nether_loading_progress_screen'
 |'theend_loading_progress_screen'|'world_saving_progress_screen'|'fetching_edu_cloud_worlds'|'edu_cloud_download_progress_screen'
 |'fetching_edu_servers'|'joining_edu_server'|'world_convert_modal_progress_screen';
export type ProgressContent = 'empty'|'modal_screen_content'|'progress_screen_content'|'world_convert_modal_progress_screen_content'
 |'realms_loading_world_modal_progress_screen_content'|'world_save_modal_progress_screen_content'|'cloud_upload_screen_content'
 |'edu_cloud_fetch_screen_content'|'cloud_download_screen_content'|'edu_server_fetch_screen_content'|'joining_edu_server_progress_screen_content';
export type ProgressScreenAnimation = 'screen_exit_animation_push_fade'|'screen_exit_animation_pop_fade'|'screen_entrance_animation_push_fade'|'screen_entrance_animation_pop_fade';
export interface ProgressCapabilities {readonly sourceProfile:'desktop'|'pocket';readonly inputMode:'mouse'|'touch';readonly educationEdition:boolean;readonly cloudSaveOn:boolean;readonly android:boolean;readonly ios:boolean}
export interface ProgressWholeImage {readonly src:string;readonly naturalSize:ProgressSize;readonly provenance:string}
export type ProgressTextRole='title'|'progress'|'code'|'error'|'button'|'pack'|'conflict'|'auxiliary';
export interface ProgressFontSpec {readonly family:string;readonly logicalSize:number;readonly lineHeight:number;readonly provenance:string}
export interface ProgressTextContext {readonly role:ProgressTextRole;readonly font:ProgressFontSpec;readonly scale:number;readonly color:string;readonly shadow:boolean;readonly sourceControl:string}
/** Glyph-only seam: never receives or replaces a complete source panel. */
export type ProgressTextRenderer=(text:string,context:ProgressTextContext)=>ReactNode;
export interface ProgressPresentationProfile {
 readonly availableSize:ProgressSize;readonly scale:number;readonly fonts:Readonly<Record<ProgressTextRole,ProgressFontSpec>>;
 readonly layoutPolicy:'finite-parent-content-source-formulas-web';readonly provenance:string;
 /** Measurements for unresolved default/%c/%cm/%sm source leaves, keyed by source-control path. No native defaults inferred. */
 readonly intrinsicSizes:Readonly<Record<string,ProgressSize>>;
 readonly labels:Readonly<Record<string,string>>;readonly loadingTextColor:string;readonly titleTextColor:string;
 readonly transitions: {readonly pushSeconds:number;readonly popSeconds:number;readonly policy:'host-screen-events-web'};
 readonly customBar: {readonly kind:'native-unrecovered'}|{readonly kind:'explicit-web-clip';readonly clipRatio:number;readonly provenance:string};
 /** Exact missing literals require explicit host whole inputs when their branch is used. */
 readonly unresolvedMaterials:{readonly externalLink?:ProgressWholeImage;readonly realmsBackground?:ProgressWholeImage};
 readonly buttonStatePolicy:'unresolved-desktop-literals'|'explicit-common-classic-web';
 readonly motionPolicy:'explicit-frames-web';readonly modalPolicy:'explicit-web-stack';
}
export interface ProgressBindings {
 readonly titleText:string;readonly progressText:string;readonly titleBinding:string;readonly progressBinding:string;
 readonly cancelText:string;readonly cancelVisible:boolean;readonly retryAndAbortVisible:boolean;readonly okVisible:boolean;
 readonly ttsEnabled:boolean;readonly forceRenderBelow:boolean;
}
export interface ProgressIndicatorState {
 readonly barAnimationVisible:boolean;readonly spinnerAnimationVisible:boolean;readonly loadingBarVisible:boolean;
 readonly progressAnimationVisible:boolean;readonly useDeterminateAnimation:boolean;readonly autoSaveVisible:boolean;
 readonly percentage:number;readonly currentAmount:number;readonly totalAmount:number;
 readonly waveFrame:number;readonly spinnerFrame:number;readonly autoSaveFrame:number;readonly paused:boolean;
}
export interface ProgressPackEntry {readonly id:string;readonly name:string;readonly selected:boolean;readonly payload:unknown}
export interface ProgressPackCollection {readonly dimensions:ProgressSize;readonly entries:readonly ProgressPackEntry[]}
export interface ProgressPackState {readonly required:ProgressPackCollection;readonly optional:ProgressPackCollection;readonly selectedCountText:string;readonly selectedSizeText:string}
export type ProgressResourcePopupId='test'|'resource_pack_download_server_required'|'resource_pack_download_optional_and_required'|'resource_pack_download_optional'|'resource_pack_download_required';
export interface ProgressResourcePopup {readonly instanceId:string;readonly factoryId:ProgressResourcePopupId;readonly description:string;readonly showRayTracingWarning:boolean;readonly rayTracingWarning:string;readonly joinEverythingText:string;readonly joinRequiredText:string}
export interface ProgressCloudState {readonly uploadError:boolean;readonly downloadError:boolean;readonly uploadImagesVisible:boolean;readonly oneButtonPanel:boolean;readonly linkVisible:boolean;readonly hyperlinkLabel:string;readonly codeText:string;readonly codeNumber:string;readonly serverTimeoutText:string}
export interface ProgressConflictPopup {readonly instanceId:string;readonly description:string;readonly localName:string;readonly localDate:string;readonly cloudName:string;readonly cloudDate:string}
export interface ProgressAuxiliaryState {readonly mobileDataVisibleAtInstanceCreation:boolean;readonly serverRegionVisible:boolean;readonly serverRegionText:string;readonly serverRegionPingIcon:ProgressWholeImage|null}
export type ProgressActionTarget='button.menu_exit'|'button.menu_retry'|'button.confirm_download'|'button.deny_packs'|'button.join_and_download_everything'|'button.join_and_download_required'|'button.leave'|'button.join'|'modal.escape'|'button.download_failed_open'|'button.download_failed_cancel'|'button.edu_cloud_hyperlink'|'button.edu_cloud_conflict_resolution_local_button'|'button.edu_cloud_conflict_resolution_cloud_button'|'button.edu_cloud_conflict_resolution_both_button'|'button.close_edu_cloud_conflict_resolution_popup';
export interface ProgressActionDetail {readonly runKey:string;readonly target:ProgressActionTarget;readonly sourceControl:string;readonly origin:'control'|'keyboard'|'host-controller';readonly instanceId?:string;readonly control:HTMLElement;readonly event?:SyntheticEvent<HTMLElement>}
export interface ProgressPackSelectionDetail {readonly runKey:string;readonly collection:'required_resourcepacks'|'optional_resourcepacks';readonly id:string;readonly index:number;readonly selected:boolean;readonly payload:unknown;readonly instanceId:string}
export interface ProgressScreenModel {
 readonly runKey:string;readonly open:boolean;readonly disabled:boolean;readonly readOnly:boolean;readonly route:ProgressRoute;
 readonly capabilities:ProgressCapabilities;readonly bindings:ProgressBindings;readonly indicators:ProgressIndicatorState;
 readonly packs:ProgressPackState;readonly resourcePopup:ProgressResourcePopup|null;readonly cloud:ProgressCloudState;readonly conflictPopup:ProgressConflictPopup|null;readonly auxiliary:ProgressAuxiliaryState;
 readonly profile:ProgressPresentationProfile;
 /** Explicit source helper selection for the generic root, not an invented default route. */
 readonly injectedContent:null|{readonly content:ProgressContent;readonly provenance:string};
 readonly onAction:(detail:ProgressActionDetail)=>void|false;readonly onPackSelectionChange:(detail:ProgressPackSelectionDetail)=>void|false;
 readonly renderText?:ProgressTextRenderer;readonly rootRef?:Ref<HTMLElement>;
 readonly nativeProps?:Omit<HTMLAttributes<HTMLElement>,'children'|'dangerouslySetInnerHTML'|'style'> & {readonly style?:CSSProperties};
}
export type ProgressScreenSnapshot=Readonly<ProgressScreenModel>;
export interface ProgressResolvedRoute {
 readonly route:ProgressRoute;readonly content:ProgressContent;readonly contentProvenance:'source'|'inherited-empty'|'explicit-host-source-helper';
 readonly background:'inherited'|'overworld_loading_background'|'nether_loading_background'|'theend_loading_background'|'realms_loading_background';
 readonly animations:readonly ProgressScreenAnimation[];readonly rootMappings:readonly {readonly from:'button.menu_cancel';readonly to:'button.menu_exit';readonly scope:'global'}[];
 readonly sourceChain:readonly string[];readonly gateSatisfied:boolean;
 readonly panels:readonly string[];readonly resourceFactoryDeclared:boolean;readonly conflictFactoryDeclared:boolean;
 readonly nativeCertified:false;
}
