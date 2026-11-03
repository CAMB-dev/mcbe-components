import type {AutoSaveInfoLayout} from './auto-save-info-types';
const finite=(n:number,name:string)=>{if(typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>8192)throw new RangeError(name+' must be finite and bounded.');return n;};
function pair(v:readonly number[],name:string,positive=false){if(!Array.isArray(v)||v.length!==2)throw new TypeError(name+' requires a dense pair.');const r=[finite(v[0]!,name),finite(v[1]!,name)]as const;if(positive&&r.some(n=>n<=0))throw new RangeError(name+' must be positive.');return r;}
export function autoSaveScale(n:number){if(!Number.isSafeInteger(n)||n<1||n>8)throw new RangeError('Autosave scale must be integer1..8.');return n;}
export function autoSaveFrame(n:number){if(!Number.isInteger(n)||n<0||n>8)throw new RangeError('Autosave frame must be integer0..8.');return n;}
export function planAutoSaveInfo(v:AutoSaveInfoLayout){
  if(!v)throw new TypeError('Autosave layout is required.');
  const size=pair(v.size,'Frame',true),panelOrigin=pair(v.panelOrigin,'Panel origin'),s=autoSaveScale(v.scale);
  if(size.some(n=>n*s>8192)||size[0]*size[1]*s*s>16777216)throw new RangeError('Autosave frame exceeds its pixel budget.');
  if(panelOrigin[0]<0||panelOrigin[1]<0||panelOrigin[0]+200>size[0]||panelOrigin[1]+180>size[1])throw new RangeError('The200x180 panel must fit its declared frame.');
  if(!v.font||typeof v.font.family!=='string'||!v.font.family.trim()||v.font.family.length>4096)throw new TypeError('Explicit autosave font metrics are required.');
  const font={family:v.font.family,size:finite(v.font.size,'Font size'),lineHeight:finite(v.font.lineHeight,'Line height')};
  if(font.size<=0||font.size>64||font.lineHeight<=0||font.lineHeight>64)throw new RangeError('Autosave font metrics must be within1..64.');
  const titleSize=pair(v.titleSize,'Title label',true),acceptLabelSize=pair(v.acceptLabelSize,'Accept label',true);
  if(titleSize[0]>200||titleSize[1]>180||acceptLabelSize[0]>182||acceptLabelSize[1]>24.6)throw new RangeError('Autosave labels exceed their source containers.');
  if(!['left','center'].includes(v.messageAlignment)||!['top','center'].includes(v.messageVerticalAlignment))throw new TypeError('Explicit message alignment is required.');
  return {size,panelOrigin,scale:s,font,titleSize,acceptLabelSize,messageAlignment:v.messageAlignment,messageVerticalAlignment:v.messageVerticalAlignment,
    title:[(200-titleSize[0])/2,180*.03,...titleSize]as const,message:[200*.05,180*.1,200*.85,180*.85]as const,
    icon:[(200-18)/2,(180-30)/2+180*.05,18,30]as const,button:[200*.03,180*(1-.03-.17),200*.94,180*.17]as const};
}
