import {createRef} from 'react';
import {ProgressScreen,ProgressIndicators,ProgressPackGrids,ProgressResourceDialog,ProgressCloudPanel,ProgressCloudConflictDialog} from 'mcbeui';
import type {ProgressScreenProps,ProgressControllerHandle,ProgressIndicatorsProps,ProgressPackGridsProps,ProgressResourceDialogProps,ProgressCloudPanelProps,ProgressCloudConflictDialogProps,ProgressResourcePopup,ProgressActionDetail,ProgressPackSelectionDetail} from 'mcbeui';
import {makeProgressProps} from './model';

export const resourcePopup:ProgressResourcePopup={instanceId:'package-resource',factoryId:'test',description:'Package resource description',showRayTracingWarning:true,rayTracingWarning:'Package warning',joinEverythingText:'All package packs',joinRequiredText:'Required package packs'};
export function makePartProps(){
 const snapshot:ProgressScreenProps={...makeProgressProps(),onAction:(detail:ProgressActionDetail)=>{const target:ProgressActionDetail['target']=detail.target;void target;detail.event?.isDefaultPrevented();return false;},onPackSelectionChange:(detail:ProgressPackSelectionDetail)=>{const collection:'required_resourcepacks'|'optional_resourcepacks'=detail.collection;void collection;void detail.payload;return false;}};
 const grid:ProgressPackGridsProps={runKey:snapshot.runKey,instanceId:'package-grid',profile:snapshot.profile,packs:snapshot.packs,disabled:false,readOnly:false,size:[430,100],onSelectionChange:detail=>{void detail.id;void detail.payload;return false;},nativeHandlers:{onChange:event=>{void event.currentTarget.checked;}}};
 const resource:ProgressResourceDialogProps={snapshot,popup:resourcePopup};
 const cloud:ProgressCloudPanelProps={snapshot,kind:'upload',imageClipPolicy:'visible-fraction-web'};
 const conflict:ProgressCloudConflictDialogProps={snapshot:{...snapshot,conflictPopup:{instanceId:'package-conflict',description:'Package conflict',localName:'Package local',localDate:'Host date local',cloudName:'Package cloud',cloudDate:'Host date cloud'}}};
 const indicator:ProgressIndicatorsProps={templates:['wave','spinner','fancy','thick','custom','autosave','cloud-upload'],state:snapshot.indicators,availableSize:[200,100],scale:1,imageClipPolicy:'visible-fraction-web',customBar:snapshot.profile.customBar,label:'Package indicators'};
 return{snapshot,grid,resource,cloud,conflict,indicator};
}
export function PackageProgressFixture(){const p=makePartProps(),controller=createRef<ProgressControllerHandle>();
 const accepted:boolean=controller.current?.request('button.menu_cancel')??false;void accepted;
 return <><ProgressScreen {...p.snapshot} controllerRef={controller} ref={createRef<HTMLElement>()}/><ProgressIndicators {...p.indicator} ref={createRef<HTMLDivElement>()}/><ProgressPackGrids {...p.grid} ref={createRef<HTMLDivElement>()}/><ProgressResourceDialog {...p.resource} ref={createRef<HTMLDivElement>()}/><ProgressCloudPanel {...p.cloud} ref={createRef<HTMLDivElement>()}/><ProgressCloudConflictDialog {...p.conflict} ref={createRef<HTMLDivElement>()}/></>;
}
function declarationNegatives(){
 // @ts-expect-error Unknown source registration route.
 const route:ProgressScreenProps['route']='automatic';void route;
 // @ts-expect-error The unrelated shared-template default is not the Progress resource Escape.
 const target:ProgressActionDetail['target']='popup_dialog.escape';void target;
 // @ts-expect-error The source exposes exactly five resource factories.
 const factory:ProgressResourcePopup['factoryId']='download-anything';void factory;
 // @ts-expect-error Private raw owner sink is not public wrapper API.
 const sink:ProgressCloudPanelProps['onRequest']=()=>{};void sink;
 // @ts-expect-error Public Grid uses the typed onSelectionChange notification.
 const raw:ProgressPackGridsProps['onRawSelection']=()=>{};void raw;
 // @ts-expect-error A physical controller adapter is not inferred from arbitrary hardware names.
 createRef<ProgressControllerHandle>().current?.request('gamepad-A');
 // @ts-expect-error State and the selected clip policy cannot be omitted from an indicator leaf.
 const missing:ProgressIndicatorsProps={templates:['wave'],label:'Missing'};void missing;
 const p=makePartProps();
 // @ts-expect-error Forwarded wrapper ref is an HTMLDivElement.
 const badRef=<ProgressPackGrids {...p.grid} ref={createRef<SVGElement>()}/>;void badRef;
}
void declarationNegatives;
