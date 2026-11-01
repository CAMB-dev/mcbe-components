import {createRef} from 'react';
import {FileTransmissionScreen,FileTransmissionPanel,FileTransferProgress} from 'mcbeui';
import type {FileTransmissionModel,FileTransmissionBindings,FileTransmissionAction,FileTransmissionTarget,FileTransmissionController,FileTransmissionScreenProps,FileTransmissionPanelProps,FileTransferProgressProps,FileTransmissionPresentationProfile,FileTransmissionTextRole} from 'mcbeui';
import {makeFileTransmissionModel} from './model';

export function makeFilePartProps(){
 const model:FileTransmissionModel={...makeFileTransmissionModel(),onAction:(detail:FileTransmissionAction)=>{const target:FileTransmissionTarget=detail.target;void target;detail.event?.isDefaultPrevented();return false;}};
 const panel:FileTransmissionPanelProps={model,onNativeClick:event=>{const current:HTMLDivElement=event.currentTarget;void current;}};
 const screen:FileTransmissionScreenProps={model,open:true,label:'Package file transmission',baseLayer:<div>Explicit host base</div>,titleArt:<span>Explicit host title</span>,controllerRef:createRef<FileTransmissionController>(),onNativeKeyDown:event=>{const current:HTMLElement=event.currentTarget;void current;}};
 const progress:FileTransferProgressProps={width:248,scale:1,percentage:model.bindings.percentage,visible:true,imageClipPolicy:'visible-fraction-web',label:model.profile.labels.progress};
 return{model,panel,screen,progress};
}
export function PackageFileTransmissionFixture(){const p=makeFilePartProps();return <><FileTransmissionScreen key="actual-screen-ref-metadata" {...p.screen} ref={createRef<HTMLElement>()}/><FileTransmissionPanel key="actual-panel-ref-metadata" {...p.panel} ref={createRef<HTMLDivElement>()}/><FileTransferProgress key="actual-progress-ref-metadata" {...p.progress} ref={createRef<HTMLDivElement>()}/></>;}
function declarationNegatives(){
 // @ts-expect-error Source controller IDs are explicit, not inferred physical buttons.
 createRef<FileTransmissionController>().current?.request('gamepad-A');
 // @ts-expect-error Source targets have their own family namespace.
 const target:FileTransmissionTarget='button.send';void target;
 // @ts-expect-error No inferred progress value/max API on this source-bound image leaf.
 const ratio:FileTransferProgressProps['value']=1;void ratio;
 // @ts-expect-error The compact public profile does not expose the Progress family's intrinsic dictionary.
 const intrinsic:FileTransmissionPresentationProfile['intrinsicSizes']={};void intrinsic;
 // @ts-expect-error Font roles are restricted to this family.
 const role:FileTransmissionTextRole='conflict';void role;
 // @ts-expect-error Independent source visibility flags are boolean.
 const visible:FileTransmissionBindings['warningContentVisible']=1;void visible;
 const p=makeFilePartProps();
 // @ts-expect-error Panel ref points to its real HTMLDivElement.
 const ref=<FileTransmissionPanel {...p.panel} ref={createRef<SVGElement>()}/>;void ref;
 // @ts-expect-error Screen owns its required explicit profile/model.
 const missing:FileTransmissionScreenProps={open:true,label:'Missing',baseLayer:null,titleArt:null};void missing;
}
void declarationNegatives;
