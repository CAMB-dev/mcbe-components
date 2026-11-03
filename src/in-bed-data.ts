import type {InBedControlsLayout,InBedLayout,InBedAction,InBedActionDetail,InBedButtonLayout} from './in-bed-types';
const finite=(value:number,name:string)=>{if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>1048576)throw new RangeError(name+' must be finite and bounded.');return value;};
const positive=(value:number,name:string)=>{finite(value,name);if(value<=0)throw new RangeError(name+' must be positive.');return value;};
function pair(value:readonly number[],name:string){if(!Array.isArray(value)||value.length!==2)throw new TypeError(name+' requires a dense pair.');return [finite(value[0]!,name),finite(value[1]!,name)] as const;}
export function snapshotInBedControls(value:InBedControlsLayout):InBedControlsLayout {
  if(!value||!Array.isArray(value.buttons)||value.buttons.length!==2)throw new TypeError('Two resolved in-bed buttons are required.');
  if(!Number.isSafeInteger(value.scale)||value.scale<1||value.scale>8)throw new RangeError('In-bed scale must be an integer1..8.');
  if(!value.font||typeof value.font.family!=='string'||!value.font.family.trim())throw new TypeError('Explicit in-bed font metrics are required.');
  const font={family:value.font.family,size:positive(value.font.size,'font size'),lineHeight:positive(value.font.lineHeight,'font lineHeight')};
  if(font.size>64||font.lineHeight>64)throw new RangeError('In-bed font metrics exceed their budget.');
  const readButton=(button:InBedButtonLayout|undefined)=>{
    if(!button)throw new TypeError('A resolved in-bed button is missing.');
    const size=pair(button.size,'button size'),labelSize=pair(button.labelSize,'button label size');
    if(size.some(v=>v<=2||v>512)||labelSize[0]<0||labelSize[0]>120||labelSize[1]<=0||labelSize[1]>10)throw new RangeError('In-bed button/label bounds are invalid (source max120x10).');
    return {size,labelSize};
  };
  const buttons=[readButton(value.buttons[0]),readButton(value.buttons[1])] as const;
  return {scale:value.scale,font,rowHeight:positive(value.rowHeight,'row height'),buttons};
}
export function planInBed(value:InBedLayout){
  if(!value)throw new TypeError('An explicit in-bed layout is required.');
  const size=pair(value.size,'frame size');positive(size[0],'frame width');positive(size[1],'frame height');
  if(!Array.isArray(value.contentRect)||value.contentRect.length!==4)throw new TypeError('A resolved in-bed safe-zone content rectangle is required.');
  const r=value.contentRect,contentRect=[finite(r[0],'content x'),finite(r[1],'content y'),positive(r[2],'content width'),positive(r[3],'content height')] as const;
  if(contentRect[0]<0||contentRect[1]<0||contentRect[0]+contentRect[2]>size[0]||contentRect[1]+contentRect[3]>size[1])throw new RangeError('In-bed content rectangle exceeds its frame.');
  const controls=snapshotInBedControls({...value,rowHeight:contentRect[3]*.15});
  if(size[0]*controls.scale>8192||size[1]*controls.scale>8192||size[0]*size[1]*controls.scale**2>16777216)throw new RangeError('In-bed frame exceeds its pixel budget.');
  const status=value.status;if(!status||!['left','center'].includes(status.alignment)||!['top','center'].includes(status.verticalAlignment))throw new TypeError('Explicit in-bed status anchors are required.');
  const origin=pair(status.origin,'status origin'),width=positive(status.width,'status width');
  return {size,contentRect,controls,status:{origin,width,alignment:status.alignment,verticalAlignment:status.verticalAlignment},
    // Source bottom-middle anchor, height15%, offsetY -15%: y70%.
    row:[contentRect[0]+(contentRect[2]-128)/2,contentRect[1]+contentRect[3]*.7,128,contentRect[3]*.15] as const,
    hint:[contentRect[0],contentRect[1]+contentRect[3]*.95-26,contentRect[2],26] as const};
}
export function inBedIntent(action:InBedAction,source:InBedActionDetail['source']):Omit<InBedActionDetail,'event'> {
  return {action,buttonId:action==='wake-up'?'button.wake_up_button':'button.chat',source,
    sourceControl:source==='button'?(action==='wake-up'?'bed.wake_up_button':'bed.chat_button'):'bed.in_bed_screen'};
}
