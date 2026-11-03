import type {ReactNode} from 'react';
import type {SettingsUnderlineActionRow} from './settings-fields-model';
import {worldSettingsCloudAssets as assets} from './world-settings-cloud-assets';
/** Paint only. SettingsFields owns the actual native button, refs, IME and deferred request. */
export function WorldSettingsCloudUnderlinePaint({row,width,scale,text}:{row:SettingsUnderlineActionRow;width:number;scale:number;text:ReactNode}){
 const centered=row.defaultAnchor==='center',stateX=centered?(width-row.stateWidth)/2:0,stateY=centered?(row.height-10)/2:0,panelX=centered?(row.stateWidth-row.labelPanelSize[0])/2:0,panelY=centered?(10-row.labelPanelSize[1])/2:0;
 return <span className="mc-world-cloud-underline__state" data-source-profile="edu_common.underline_text" style={{left:stateX*scale,top:stateY*scale,width:row.stateWidth*scale,height:10*scale}}>
   <span className="mc-world-cloud-underline__panel" data-source-profile="common.single_line_label" style={{left:panelX*scale,top:panelY*scale,width:row.labelPanelSize[0]*scale,height:row.labelPanelSize[1]*scale}}>
     <span className="mc-world-cloud-underline__label" style={{left:2*scale,top:scale,width:row.labelSize[0]*scale,height:row.labelSize[1]*scale}}>{text}
       <span className="mc-world-cloud-underline__line" aria-hidden="true" data-source-texture="textures/ui/underline" style={{height:scale,backgroundImage:`url(${JSON.stringify(assets['textures/ui/underline'].url)})`,backgroundSize:`${scale}px ${scale}px`}}/>
       <span className="mc-world-cloud-underline__focus-line" aria-hidden="true" data-source-texture="textures/ui/underline_focus" style={{height:scale,backgroundImage:`url(${JSON.stringify(assets['textures/ui/underline_focus'].url)})`,backgroundSize:`${scale}px ${scale}px`}}/>
     </span>
   </span>
 </span>;
}
