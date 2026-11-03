import type {SettingsFieldsTextFormatting} from './settings-fields-model';
export interface SettingsFieldTextRun {readonly text:string;readonly color?:readonly[number,number,number]}
const fail=(message:string):never=>{throw new TypeError(`SettingsFields textFormatting ${message}`);};
const code=(v:unknown):v is string=>typeof v==='string'&&/^[\x00-\x7f]$/.test(v);
/** Called only after the whole plain-data snapshot has rejected accessors/prototypes/symbols. */
export function validateSettingsFieldTextFormatting(profile:SettingsFieldsTextFormatting|undefined):void {
 if(profile===undefined)return;
 if(!profile||typeof profile!=='object'||Array.isArray(profile)||Object.keys(profile).length!==2||!Object.hasOwn(profile,'colors')||!Object.hasOwn(profile,'resetCode'))fail('requires colors and resetCode.');
 const colors=profile.colors;if(!colors||typeof colors!=='object'||Array.isArray(colors))fail('colors must be a plain named RGB record.');
 const keys=Object.keys(colors);if(keys.length>36)throw new RangeError('SettingsFields textFormatting colors has more than36 codes.');
 for(const key of keys){if(!code(key))fail('color keys must be single ASCII characters.');const rgb=colors[key];if(!Array.isArray(rgb)||rgb.length!==3||![0,1,2].every(i=>Object.hasOwn(rgb,i))||rgb.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>1))throw new RangeError('SettingsFields textFormatting RGB requires three finite components in0..1.');}
 if(profile.resetCode!==null&&(!code(profile.resetCode)||Object.hasOwn(colors,profile.resetCode)))fail('resetCode must be null or one ASCII character distinct from every color code.');
}
/** Exact declared codes only. Unknown sequences remain literal; no styles or case aliases are inferred. */
export function parseSettingsFieldText(value:string,profile:SettingsFieldsTextFormatting|undefined):{readonly text:string;readonly runs:readonly SettingsFieldTextRun[]} {
 if(typeof value!=='string'||value.length>1048576)throw new RangeError('SettingsFields display text must be bounded to1048576 UTF-16 units.');
 if(!profile)return Object.freeze({text:value,runs:Object.freeze([Object.freeze({text:value})])});
 const runs:SettingsFieldTextRun[]=[];let start=0,color:readonly[number,number,number]|undefined;
 const append=(text:string)=>{if(!text)return;if(runs.length>=4096)throw new RangeError('SettingsFields formatted text exceeds4096 runs.');runs.push(Object.freeze({text,...(color?{color}:{})}));};
 for(let i=0;i<value.length-1;i++)if(value[i]==='§'){
  const key=value[i+1]!,known=Object.hasOwn(profile.colors,key),reset=key===profile.resetCode;
  if(known||reset){append(value.slice(start,i));color=reset?undefined:profile.colors[key];start=i+2;}i++;
 }
 append(value.slice(start));return Object.freeze({text:runs.map(run=>run.text).join(''),runs:Object.freeze(runs)});
}
