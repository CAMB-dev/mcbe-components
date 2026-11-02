import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';

// Independent source-only POINT mapper. No production source/helper imports,
// captured pixels, browser outputs or private resources enter this generator.
const root=path.dirname(fileURLToPath(import.meta.url));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const originalBytes=fs.readFileSync(path.join(root,'ORIGINALS.json'));
const originals=JSON.parse(originalBytes), images={}, metadata={};
for(const record of originals.files){const b=fs.readFileSync(path.join(root,'ORIGINALS',record.entry));assert.equal(b.length,record.bytes);assert.equal(hash(b),record.sha256);if(record.entry.startsWith('resource_pack/textures/ui/')){const name=path.basename(record.entry,path.extname(record.entry));if(record.entry.endsWith('.png'))images[name]=PNG.sync.read(b);else metadata[name]=JSON.parse(b);}}
const backdrop=[32,48,64,255],qualified=[],checks=[];
for(const[name,image]of Object.entries(images)){for(let i=3;i<image.data.length;i+=4)assert(image.data[i]===0||image.data[i]===255,'Only binary source alpha in this finite fixture');checks.push({source:name,binaryAlpha:true,size:[image.width,image.height]});}

function plane(width,height){const p=new PNG({width,height});for(let i=0;i<p.data.length;i+=4)p.data.set(backdrop,i);return p;}
function over(destination,x,y,source,sx,sy,opacity=1,brightness=1){
 const s=4*(sy*source.width+sx),d=4*(y*destination.width+x),a=Math.floor(source.data[s+3]*opacity+.5);
 if(!a)return;
 // Pre-existing, independently scalar-qualified Chromium CSS opaque-image
 // opacity profile; explicitly not a recovered native blending equation.
 for(let c=0;c<3;c++){const color=Math.floor(source.data[s+c]*brightness+.5);destination.data[d+c]=Math.floor(color*(a+1)/256)+Math.floor(destination.data[d+c]*(256-a)/256);}
 destination.data[d+3]=255;
}
function coordinate(pixel,destination,source,before,after,scale){
 const leading=before*scale,trailing=after*scale;
 if(pixel<leading)return Math.min(source-1,Math.floor((2*pixel+1)*before/(2*leading)));
 if(pixel>=destination-trailing)return Math.min(source-1,source-after+Math.floor((2*(pixel-(destination-trailing))+1)*after/(2*trailing)));
 const sourceCenter=source-before-after,destinationCenter=destination-leading-trailing;
 assert(destinationCenter>=0&&sourceCenter>=0);
 // The only zero-centre case here is the whole uniform locked2x2 image.
 if(sourceCenter===0)return Math.min(source-1,before);
 assert(destinationCenter>0);
 return Math.min(source-1,before+Math.floor((2*(pixel-leading)+1)*sourceCenter/(2*destinationCenter)));
}
function nine(p,name,rect,scale,{opacity=1,brightness=1}={}){const image=images[name],m=metadata[name];assert.deepEqual(m.base_size,[image.width,image.height]);const cuts=Array.isArray(m.nineslice_size)?m.nineslice_size:Array(4).fill(m.nineslice_size),[x,y,w,h]=rect;for(let py=0;py<h;py++)for(let px=0;px<w;px++)over(p,x+px,y+py,image,coordinate(px,w,image.width,cuts[0],cuts[2],scale),coordinate(py,h,image.height,cuts[1],cuts[3],scale),opacity,brightness);}
function sprite(p,name,rect){const a=images[name],[x,y,w,h]=rect;for(let y1=0;y1<h;y1++)for(let x1=0;x1<w;x1++)over(p,x+x1,y+y1,a,Math.floor((2*x1+1)*a.width/(2*w)),Math.floor((2*y1+1)*a.height/(2*h)));}
function fill(p,name,rect,opacity){spriteWithOpacity(p,images[name],rect,opacity);}
function spriteWithOpacity(p,a,[x,y,w,h],opacity){for(let y1=0;y1<h;y1++)for(let x1=0;x1<w;x1++)over(p,x+x1,y+y1,a,Math.floor((2*x1+1)*a.width/(2*w)),Math.floor((2*y1+1)*a.height/(2*h)),opacity);}
const cases=[];
for(const scale of[1,2]){
 cases.push({id:`panel-normal-s${scale}`,kind:'panel',state:'normal',scale,logicalSize:[316,179],paint(p){fill(p,'control',[4*scale,4*scale,308*scale,171*scale],.8);nine(p,'dialog_background_hollow_2',[0,0,316*scale,179*scale],scale);}});
 for(const state of['normal','hover','disabled'])cases.push({id:`field-${state}-s${scale}`,kind:'field',state,scale,logicalSize:[295,38],paint(p){nine(p,state==='hover'?'edit_box_indent_hover':'edit_box_indent',[0,10*scale,295*scale,25*scale],scale,{opacity:state==='disabled'?.5:1});}});
 for(const state of['normal','hover','pressed','locked'])cases.push({id:`button-${state}-s${scale}`,kind:'button',state,scale,logicalSize:[150,30],paint(p){nine(p,{normal:'button_borderless_light',hover:'button_borderless_lighthover',pressed:'button_borderless_lightpressed',locked:'disabledButtonNoBorder'}[state],[scale,scale,148*scale,28*scale],scale);nine(p,'focus_border_white',[0,0,150*scale,30*scale],scale,{brightness:state==='normal'||state==='locked'?.075:1});}});
}
for(const state of['normal','hover','pressed'])cases.push({id:`close-${state}-s1`,kind:'close',state,scale:1,logicalSize:[21,21],paint(p){sprite(p,{normal:'close_button_default',hover:'close_button_hover',pressed:'close_button_pressed'}[state],[3,3,15,15]);}});
assert.equal(cases.length,19);
const encoded=[];
for(const item of cases){const pixelSize=item.logicalSize.map(n=>n*item.scale),p=plane(...pixelSize);item.paint(p);assert(p.data.every((v,i)=>i%4!==3||v===255));const bytes=PNG.sync.write(p);const{paint,...data}=item;qualified.push({...data,pixelSize,wholePixels:p.width*p.height,expected:`EXPECTED/${item.id}.png`,pngSHA256:hash(bytes),rgbaSHA256:hash(p.data)});encoded.push([`EXPECTED/${item.id}.png`,bytes]);}
const protocol={schema:1,status:'FROZEN_BEFORE_THIS_FAMILY_BROWSER_MEASUREMENT',sourceArchive:originals.archive,originalsSHA256:hash(originalBytes),scope:'19 complete source-derived no-text material planes only; not natural input-state, source font/layout/native screen certification.',
 host:{deviceScaleFactor:1,backdrop,integerOrigins:true,fixture:'/demo/external-server-fixture.html?materials=1',api:'window.externalServerMaterial.setMaterial({kind,state,scale})',target:'returned original production control selector; entire outer box, including all field padding and close halo'},
 sampling:{policy:'Independent destination pixel-centre rational POINT pull through raw source nine-slice intervals; original PNG pixels are whole and unmodified.',degenerate:'Uniform original locked2x2 has zero centres: clamped boundary sample; uniform4texels makes this finite result independent of choice.',opacity:'Prior-qualified Chromium CSS opaque-image UNORM8 profile: A=floor(sourceA*opacity+.5); output=floor(sourceC*(A+1)/256)+floor(backdrop*(256-A)/256). At A255, preserve exact sourceRGB. Not native/linear-space or all-renderer proof.',brightness:'Original binary-alpha white border times .075 then nearest UNORM8; white255→19 (not a half tie).',priorOpacityReference:{path:'tests/fixtures/file-transmission-materials/CALIBRATED-WEB-01/MATERIAL-PROTOCOL.CALIBRATED.json',sha256:'201b9cb747c3fb614c6f99dec73e52fc699d767918f9a72b4203566439447f37',scope:'Independent earlier scalar/heldout Web observations only; not from this family or current product output.'},tolerance:0,mask:null},
 isolation:{panel:'Only original outer frame and normal underfill .8; title/input/actions/close paint isolated by fixture.',field:'Entire295x38 group; label/input/placeholder/caret ink hidden, original editor25 and disabledopacity.5 retained.',button:'Entire150x30 control; labels hidden, exactly one original source state forced via fixture. Original .075 border retained where declared.',close:'Entire21x21 hitbox; whole15x15 original centred inset3. No parent frame, wash or neighbouring button paint.',boundary:'Fixture state-forcing isolates materials, not proof of natural hover/pressed/focus routing. No box dimensions are changed by these expected inputs.'},planes:qualified};
const protocolBytes=Buffer.from(JSON.stringify(protocol,null,2)+'\n');
const outputs=[...encoded,['PROTOCOL.json',protocolBytes],['PROTOCOL.sha256',Buffer.from(hash(protocolBytes)+'  PROTOCOL.json\n')],['CPU-CHECKS.json',Buffer.from(JSON.stringify({planes:qualified.length,sourceImages:Object.keys(images).length,checks,allOpaqueExpected:true,productionHelpersImported:false,nativeOrBrowserInputs:false,browserExecuted:false},null,2)+'\n')]];
for(const[name,bytes]of outputs){const p=path.join(root,name);if(process.argv.includes('--check'))assert(fs.readFileSync(p).equals(bytes),'Fixture drift: '+name);else{fs.mkdirSync(path.dirname(p),{recursive:true});if(!fs.existsSync(p)||!fs.readFileSync(p).equals(bytes))fs.writeFileSync(p,bytes);}}
console.log(JSON.stringify({planes:qualified.length,originals:originals.files.length,protocolSHA256:hash(protocolBytes),checkOnly:process.argv.includes('--check'),browser:false}));
