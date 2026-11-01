import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {ProgressResourceDialog} from '../src';
import type {ProgressResourcePopupId} from '../src';
import {makeProgressScreenProps} from '../tests/fixtures/progress-profile';
import '../src/progress-public-parts.css';
const root=createRoot(document.getElementById('progress-resource-material-host')!);
const harness={ready:true,render(factoryId:ProgressResourcePopupId){
 const s=makeProgressScreenProps(),profile={...s.profile,availableSize:[500,301] as const,intrinsicSizes:{...s.profile.intrinsicSizes,'progress.simple_popup_dialog_base':[250,209] as const}};
 flushSync(()=>root.render(<ProgressResourceDialog snapshot={{...s,profile}} popup={{instanceId:factoryId,factoryId,description:'Frozen material isolation',showRayTracingWarning:false,rayTracingWarning:'',joinEverythingText:'All',joinRequiredText:'Required'}}/>));
}};
declare global{interface Window{progressResourceMaterial:typeof harness}}
window.progressResourceMaterial=harness;harness.render('resource_pack_download_required');
