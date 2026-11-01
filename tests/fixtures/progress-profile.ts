import type { ProgressScreenProps } from '../../src/progress-screen';
import type { ProgressFontSpec, ProgressSize, ProgressTextRole, ProgressWholeImage } from '../../src/progress-types';
import { PROGRESS_CLOUD_INTRINSIC_KEYS, PROGRESS_CLOUD_ERROR_INTRINSIC_KEYS, PROGRESS_CLOUD_LINK_INTRINSIC_KEYS, PROGRESS_CLOUD_TIMEOUT_INTRINSIC_KEYS, PROGRESS_CONFLICT_INTRINSIC_KEYS } from '../../src/progress-cloud';

/** Test-only authored finite Web measurements. These are neither native
 * defaults nor a recommended product presentation profile. Whole source art
 * below is deliberately selected by the host, including unresolved providers. */
export function makeProgressScreenProps(): ProgressScreenProps {
  const provenance='Authored finite Web test fixture; no native geometry/font/provider claim';
  const font:ProgressFontSpec={family:'monospace',logicalSize:10,lineHeight:12,provenance};
  const roles:readonly ProgressTextRole[]=['title','progress','code','error','button','pack','conflict','auxiliary'];
  const fonts=Object.fromEntries(roles.map(role=>[role,{...font}])) as Record<ProgressTextRole,ProgressFontSpec>;
  const intrinsicSizes:Record<string,ProgressSize>={
    'progress.world_modal_progress_panel':[290,100],
    'progress.world_modal_progress_panel/progress_title_text':[100,12],
    'progress.world_modal_progress_panel/progress_bar_text':[150,12],
    'progress.world_modal_progress_panel/loading_bar_panel':[278,8],
    'progress.world_modal_progress_panel/modal_button_panel':[278,26],
    'progress.modal_progress_panel_with_cancel/progress_title_text':[100,20],
    'progress.modal_progress_panel_with_cancel/progress_bar_text':[150,20],
    'progress.title_panel/progress_title_text':[100,20],
    'progress.title_panel/progress_bar_text':[150,20],
    'progress.mobile_data_icon':[90,55],
    'progress.mobile_data_icon_text':[90,35],
    'progress.server_region_connected_text':[80,70],
    'progress.popup_dialog_base.scrolling_panel':[450,180],
    'progress.popup_dialog_base.scrolling_pane':[440,170],
    'progress.popup_dialog_base.scrolling_pane.offset':[1,1],
    'progress.resource_pack_section':[430,89],
    'progress.popup_dialog_base.totalSelected':[220,10],
    'progress.popup_dialog_base.totalSelectedSize':[110,10],
    'progress.simple_popup_dialog_base':[250,210],
    'progress.simple_popup_dialog_base.description':[230,24],
    'progress.simple_popup_dialog_base.description2':[230,12],
  };
  for(const[kind,keys]of Object.entries(PROGRESS_CLOUD_INTRINSIC_KEYS)){
    intrinsicSizes[keys[0]!]=[100,20];intrinsicSizes[keys[1]!]=[150,kind==='download'?40:60];
    intrinsicSizes[keys[2]!]=[kind==='download'?270:258,16];
    for(const key of keys.slice(3))intrinsicSizes[key]=[16,16];
  }
  PROGRESS_CLOUD_TIMEOUT_INTRINSIC_KEYS.forEach((key,index)=>{intrinsicSizes[key]=index===0?[100,20]:index===1?[150,60]:index===2?[258,16]:[16,16];});
  const errorSizes:readonly ProgressSize[]=[[300,160],[300,160],[288,20],[100,20],[300,80],[276,60],[260,24],[60,12],[30,12],[130,12],[9,9]];
  PROGRESS_CLOUD_ERROR_INTRINSIC_KEYS.forEach((key,index)=>{intrinsicSizes[key]=errorSizes[index]!;});
  const linkSizes:readonly ProgressSize[]=[[130,10],[130,15],[130,12]];
  PROGRESS_CLOUD_LINK_INTRINSIC_KEYS.forEach((key,index)=>{intrinsicSizes[key]=linkSizes[index]!;});
  const conflictSizes:readonly ProgressSize[]=[[130,12],[250,24],[250,24],[250,48],[250,12],[250,12],[250,12],[250,12]];
  PROGRESS_CONFLICT_INTRINSIC_KEYS.forEach((key,index)=>{intrinsicSizes[key]=conflictSizes[index]!;});
  const whole=(src:string,naturalSize:ProgressSize,choice:string):ProgressWholeImage=>({src,naturalSize,provenance:`${provenance}; whole original host selection: ${choice}`});
  const serverImage=whole(new URL('../../src/assets/progress/ui/servers.png',import.meta.url).href,[15,15],'servers.png as explicit test icon, not a recovered ping provider');
  return {
    runKey:'progress-fixture-run',open:true,disabled:false,readOnly:false,route:'world_loading_progress_screen',
    capabilities:{sourceProfile:'desktop',inputMode:'mouse',educationEdition:false,cloudSaveOn:false,android:true,ios:true},
    bindings:{titleText:'Host title',progressText:'Host progress text',titleBinding:'#title_text',progressBinding:'#progress_text',cancelText:'Cancel',cancelVisible:true,retryAndAbortVisible:false,okVisible:true,ttsEnabled:true,forceRenderBelow:false},
    indicators:{barAnimationVisible:true,spinnerAnimationVisible:false,loadingBarVisible:true,progressAnimationVisible:true,useDeterminateAnimation:false,autoSaveVisible:false,percentage:1/3,currentAmount:17,totalAmount:999,waveFrame:4,spinnerFrame:5,autoSaveFrame:4,paused:true},
    packs:{required:{dimensions:[2,3],entries:[{id:'required-1',name:'Required pack',selected:false,payload:{fixture:'required opaque value'}}]},optional:{dimensions:[1,2],entries:[{id:'optional-1',name:'Optional pack',selected:true,payload:{fixture:'optional opaque value'}}]},selectedCountText:'Host count 77',selectedSizeText:'Host size arbitrary'},
    resourcePopup:null,conflictPopup:null,
    cloud:{uploadError:false,downloadError:false,uploadImagesVisible:true,oneButtonPanel:true,linkVisible:true,hyperlinkLabel:'Host support link',codeText:'Code ',codeNumber:'ABC-37',serverTimeoutText:'Cancel server wait'},
    auxiliary:{mobileDataVisibleAtInstanceCreation:true,serverRegionVisible:true,serverRegionText:'Host region',serverRegionPingIcon:serverImage},
    profile:{availableSize:[500,300],scale:1,fonts,layoutPolicy:'finite-parent-content-source-formulas-web',provenance,intrinsicSizes,
      labels:{'gui.close':'Close','gui.ok':'OK','gui.cancel':'Cancel','gui.retry':'Retry','progressScreen.progress':'Progress','progressScreen.label.mobileData':'Mobile data',
        'progressScreen.dialog.title.resourcePack':'Resource packs','progressScreen.dialog.button.leave':'Leave','progressScreen.dialog.button.join':'Join',
        'edu.cloudError.local.download.open':'Open local','popup.title.eduCloudConflictResolution':'Choose a world','popup.buttons.eduConflictResolution.local':'Keep local','popup.buttons.eduConflictResolution.cloud':'Keep cloud','popup.buttons.eduConflictResolution.both':'Keep both'},
      loadingTextColor:'#ffffff',titleTextColor:'#4c4c4c',transitions:{pushSeconds:.2,popSeconds:.3,policy:'host-screen-events-web'},
      customBar:{kind:'explicit-web-clip',clipRatio:.6,provenance:`${provenance}; independent of amount/total`},
      unresolvedMaterials:{
        externalLink:whole(new URL('../../src/assets/progress/ui/servers.png',import.meta.url).href,[15,15],'servers.png test substitution; exact icon_external_link remains unresolved'),
        realmsBackground:whole(new URL('../../src/assets/progress/ui/navy_blue.png',import.meta.url).href,[24,24],'navy_blue.png test substitute for the unresolved Realms background template'),
      },buttonStatePolicy:'explicit-common-classic-web',motionPolicy:'explicit-frames-web',modalPolicy:'explicit-web-stack'},
    injectedContent:null,onAction:()=>{},onPackSelectionChange:()=>{},
    imageClipPolicy:'visible-fraction-web',gradientPolicy:'css-linear-top-bottom-web',transition:null,
    branding:{image:whole(new URL('../../src/assets/start-menu/title.png',import.meta.url).href,[1937,333],'whole title.png; explicit test branding provider'),box:[140,10,220,220*333/1937],sourceVariant:'title_panel_win10',provenance},
  };
}
