import assert from 'node:assert/strict';

// Geometry assertions must not scan opaque PNG data URLs or literal host text.
const geometricStyle=/^(?:left|right|top|bottom|width|height|min-width|min-height|max-width|max-height|inset(?:-.+)?|margin(?:-.+)?|padding(?:-.+)?|border(?:-.+)?-width|background-size|background-position(?:-.+)?|font-size|line-height|letter-spacing|word-spacing|opacity|transform|translate|scale|z-index|flex-grow|flex-shrink|flex-basis|grid-template-columns|grid-template-rows|gap|row-gap|column-gap|clip-path)$/;
const nonfinite=/(?:^|[\s,(])(?:NaN|[+-]?Infinity)(?=$|[\s,)]|(?:px|em|rem|%|vh|vw|s|ms)\b)/;
function declarations(style){
 const result=[];let from=0,depth=0,quote=null,escape=false;
 for(let i=0;i<=style.length;i++){
  const c=style[i];
  if(escape){escape=false;continue;}
  if(c==='\\'){escape=true;continue;}
  if(quote){if(c===quote)quote=null;continue;}
  if(c==='"'||c==="'"){quote=c;continue;}
  if(c==='(')depth++;else if(c===')')depth=Math.max(0,depth-1);
  if(i===style.length||c===';'&&depth===0){result.push(style.slice(from,i));from=i+1;}
 }
 return result;
}
export function assertFiniteProgressGeometry(html){
 for(const match of html.matchAll(/\bstyle="([^"]*)"/g))for(const declaration of declarations(match[1])){
  const colon=declaration.indexOf(':');if(colon<0)continue;
  const property=declaration.slice(0,colon).trim(),value=declaration.slice(colon+1).trim();
  if(geometricStyle.test(property))assert(!nonfinite.test(value),`Nonfinite published geometry ${property}: ${value}`);
 }
 const geometricAttribute=/\b(width|height|x|y|viewBox|points|aria-valuenow|aria-valuemin|aria-valuemax|data-frame|data-current-amount|data-total-amount|data-source-clip-ratio)="([^"]*)"/g;
 for(const tag of html.matchAll(/<[A-Za-z][^>]*>/g))for(const match of tag[0].matchAll(geometricAttribute))assert(!nonfinite.test(match[2]),`Nonfinite published geometry attribute ${match[1]}`);
}
