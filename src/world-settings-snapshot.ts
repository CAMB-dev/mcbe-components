/** Private finite materialized data copier. Accessors and capabilities belong to
 * explicit props, never to source snapshots, including inactive records. */
export function copyWorldSettingsData<T>(value:T):T{
 const active=new Set<object>();let count=0;
 const visit=(v:unknown,depth:number):unknown=>{
  if(++count>131072||depth>48)throw new RangeError('World settings snapshot exceeds its finite data budget.');
  if(v===null||v===undefined||typeof v==='boolean')return v;
  if(typeof v==='number'){if(!Number.isFinite(v))throw new TypeError('World settings snapshot numbers must be finite.');return v;}
  if(typeof v==='string'){if(v.length>1048576)throw new RangeError('World settings snapshot text is too long.');return v;}
  if(typeof v!=='object'||(Array.isArray(v)?Object.getPrototypeOf(v)!==Array.prototype:![Object.prototype,null].includes(Object.getPrototypeOf(v)))||Object.getOwnPropertySymbols(v).length)throw new TypeError('World settings snapshots require plain data.');
  if(active.has(v))throw new TypeError('World settings snapshot cycles are forbidden.');active.add(v);
  const descriptors=Object.getOwnPropertyDescriptors(v),names=Object.keys(v);if(names.length>16384||Array.isArray(v)&&v.length>4096)throw new RangeError('World settings snapshot collection is too large.');
  for(const d of Object.values(descriptors))if(!('value'in d))throw new TypeError('World settings snapshot accessors are forbidden.');
  let result:unknown;
  if(Array.isArray(v)){if(names.length!==v.length||names.some((n,i)=>n!==String(i)))throw new TypeError('World settings snapshot arrays must be dense.');result=Array.from({length:v.length},(_,i)=>visit(descriptors[String(i)]!.value,depth+1));}
  else{const r:Record<string,unknown>={};for(const n of names)Object.defineProperty(r,n,{enumerable:true,value:visit(descriptors[n]!.value,depth+1)});result=r;}
  active.delete(v);return Object.freeze(result);
 };return visit(value,0)as T;
}
export function worldSettingsKeys(value:unknown,keys:readonly string[],name:string):asserts value is Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))throw new TypeError(`World settings ${name} requires its exact named records.`);
}
export function worldSettingsBoolean(v:unknown,name:string):asserts v is boolean{if(typeof v!=='boolean')throw new TypeError(`World settings ${name} must be boolean.`);}
export function worldSettingsExtent(v:unknown,name:string,zero=false):asserts v is number{if(typeof v!=='number'||!Number.isFinite(v)||v<(zero?0:Number.MIN_VALUE)||v>8192)throw new RangeError(`World settings ${name} must fit finite ${zero?'nonnegative':'positive'} units <=8192.`);}
