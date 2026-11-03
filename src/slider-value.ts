/** Private HTML range-domain normalization shared by the input and its paint.
 * Decimal arithmetic avoids exposing binary artifacts such as0.30000000000000004.
 * The Slider always supplies min, so the native step base is explicitly min. */
function decimal(n:number){
  const[digits,exponent='0']=String(n).toLowerCase().split('e'),parts=digits!.split('.');
  return {integer:BigInt(parts.join('')),exponent:Number(exponent)-(parts[1]?.length??0)};
}
export function sliderRatio(value:number,min:number,max:number){
  const high=Math.max(min,max),extent=high-min;
  return high===min?0:Number.isFinite(extent)?(value-min)/extent:(value/2-min/2)/(high/2-min/2);
}
export function sliderValue(current:number,min:number,max:number,step:number|string|undefined){
  if(![current,min,max].every(n=>typeof n==='number'&&Number.isFinite(n)))throw new RangeError('Slider value/min/max must be finite numbers.');
  const high=Math.max(min,max),bounded=Math.min(high,Math.max(min,current));
  const token=step===undefined?'1':String(step);
  let value=bounded;
  if(high>min&&!/^any$/i.test(token)){
    // HTML valid floating-point attribute grammar; invalid/nonpositive step uses1.
    const parsed=/^-?(?:\d+|\d*\.\d+)(?:[eE][+-]?\d+)?$/.test(token)?Number(token):NaN;
    const increment=Number.isFinite(parsed)&&parsed>0?parsed:1;
    const parts=[bounded,min,high,increment].map(decimal),exponent=Math.min(...parts.map(p=>p.exponent));
    const[v,lo,hi,s]=parts.map(p=>p.integer*10n**BigInt(p.exponent-exponent))as[bigint,bigint,bigint,bigint];
    const below=lo+(v-lo)/s*s,above=below+s;
    const snapped=above<=hi&&above-v<=v-below?above:below;
    value=Number(`${snapped}e${exponent}`);
  }
  return {raw:bounded,value,max:high,ratio:sliderRatio(value,min,high)};
}
