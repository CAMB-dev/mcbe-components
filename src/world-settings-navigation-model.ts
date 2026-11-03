import type{Ref}from'react';
import type{SettingsNavigationDetail,SettingsNavigationProps}from'./settings-navigation';
import type{WorldSettingsMode,WorldLaunchButtonState,WorldLaunchActionsProps}from'./world-settings-actions';
import type{GuiImageBackground}from'./gui-image-webgl';
import type{GuiImageLayerState}from'./gui-image';

export type WorldSettingsNavigationId='server_settings_button'|'game_button'|'classroom_button'|'switch_game_button'|'multiplayer_button'|'edu_cloud_button'|'debug_button'|'level_texture_pack_button'|'addon_button';
/** These are resolved source variables, not inferred from a screen name or device. */
export interface WorldSettingsNavigationContext{
 readonly worldSectionIncluded:boolean;readonly packsSectionsIncluded:boolean;
 readonly spatialPatternFixEnabled:boolean;readonly pregame:boolean;readonly educationEdition:boolean;
 readonly nxOs:boolean;readonly publish:boolean;readonly editorModeEnabled:boolean;
 readonly cloudEnabled:boolean;readonly cloudGeneralToggleEnabled:boolean;readonly multiplayerClient:boolean;
}
export interface WorldSettingsNavigationImage{readonly src:string;readonly sourceSize:readonly[number,number]}
export interface WorldSettingsNavigationButtonState{
 readonly label:string;readonly panelTitle:string;readonly enabled:boolean;
 /** Exact resolved forced index, not the position among visible buttons. */
 readonly sourceIndex:number;
}
export interface WorldSettingsNavigationSnapshot{
 readonly context:WorldSettingsNavigationContext;
 readonly buttons:Readonly<Record<WorldSettingsNavigationId,WorldSettingsNavigationButtonState>>;
 readonly groups:{readonly server:{readonly label:string;readonly height:number};readonly world:{readonly label:string;readonly height:number};readonly addons:{readonly label:string;readonly height:number}};
 readonly thumbnail:{readonly textureName:string;readonly fileSystem:string;readonly image:WorldSettingsNavigationImage|null;readonly alt:string;
  /** Source fill/anchor semantics still need a declared Web projection. Sampling is always bilinear. */
  readonly webFit:'fill'|'cover'|'contain'};
 readonly server:{readonly visible:boolean;readonly iconName:string;readonly outlineName:string;readonly fileSystem:string;
  readonly icon:WorldSettingsNavigationImage|null;readonly outline:WorldSettingsNavigationImage|null;
  /** Original loading_bar has ten64×8 UV frames, projected onto the source21×14 control. No library clock. */
  readonly loadingFrame:number};
 readonly cloud:{readonly outline:WorldSettingsNavigationImage|null;readonly color:WorldSettingsNavigationImage|null};
 readonly packs:{readonly level:{readonly path:string;readonly zip:string;readonly fileSystem:string;readonly image:WorldSettingsNavigationImage|null};
  readonly addon:{readonly path:string;readonly zip:string;readonly fileSystem:string;readonly image:WorldSettingsNavigationImage|null};
  /** Exact-case White is absent from the pinned archive; caller resolution is explicit. */
  readonly border:(WorldSettingsNavigationImage&{readonly resolution:'exact-source'|'host-resolved'})|null};
 readonly launch:{readonly primary:WorldLaunchButtonState;readonly realms:WorldLaunchButtonState&{readonly visible:boolean};readonly play:WorldLaunchButtonState;readonly host:WorldLaunchButtonState};
}
export interface WorldSettingsNavigationProps extends Omit<SettingsNavigationProps,'items'|'value'|'onValueChange'|'itemRefs'>{
 readonly mode:WorldSettingsMode;readonly snapshot:WorldSettingsNavigationSnapshot;
 readonly value:WorldSettingsNavigationId|null;
 readonly onValueChange?:(value:WorldSettingsNavigationId,detail:SettingsNavigationDetail)=>void|false;
 readonly itemRefs?:Readonly<Partial<Record<WorldSettingsNavigationId,Ref<HTMLButtonElement>>>>;
 readonly nodeRefs?:Readonly<Record<string,Ref<HTMLDivElement>>>;
 readonly onLaunchAction?:WorldLaunchActionsProps['onAction'];
 readonly launchButtonProps?:WorldLaunchActionsProps['buttonProps'];readonly launchButtonRefs?:WorldLaunchActionsProps['buttonRefs'];
 /** Explicit existing source-image shader/geometry projection. Omission keeps
  * CSS presentation; this does not recover native anchors or renderer defaults. */
 readonly materialRendering?:WorldSettingsNavigationMaterialRendering;
}
export interface WorldSettingsNavigationMaterialRendering{
 readonly profile:'source-image';
 /** Cover the authored fractional intrinsic extent with an integer pixel target. */
 readonly extentPolicy:'ceil';
 /** Resolve the uniform underlying settings surface; transparent presentation
  * retains the browser compositor's separate final alpha stage. */
 readonly background:Extract<GuiImageBackground,{kind:'solid'|'transparent'}>;
 readonly renderKey?:string|number;
 readonly onStateChange?:(state:GuiImageLayerState)=>void;readonly onError?:(error:Error)=>void;
}
