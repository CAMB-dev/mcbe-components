import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';

// Independent source-only CPU oracle. No production component/helper imports.
const root='.cache/progress-source-study-02',out='.cache/progress-material-oracles-01';
const pins=JSON.parse(fs.readFileSync(root+'/SOURCE-PINS.json','utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const originals=[],checks=[];
for(const d of['ORIGINALS','EXPECTED'])fs.mkdirSync(out+'/'+d,{recursive:false});
function original(member){
 const entry=pins.rawAndMaterials.find(e=>e.member===member);
 const source=root+'/ORIGINALS/'+member,bytes=fs.readFileSync(source);
 assert(entry,'pinned source '+member);assert.equal(bytes.length,entry.bytes);assert.equal(hash(bytes),entry.sha256);
 const destination=out+'/ORIGINALS/'+member;fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes);
 originals.push({member,path:destination,bytes:bytes.length,sha256:hash(bytes)});return bytes;
}
for(const name of['progress_screen','achievement_screen','_global_variables'])original('resource_pack/ui/'+name+'.json');
const license=fs.readFileSync(root+'/ORIGINALS/LICENSE.md');fs.writeFileSync(out+'/ORIGINALS/LICENSE.md',license);originals.push({member:'LICENSE.md',path:out+'/ORIGINALS/LICENSE.md',bytes:license.length,sha256:hash(license)});
const images={},metadata={};
for(const name of['loading_spin','auto_save','experiencebarfull','experiencebarempty','progress_bar_simple','experiencenub','loading_bar']){
 images[name]=PNG.sync.read(original('resource_pack/textures/ui/'+name+'.png'));
 const member='resource_pack/textures/ui/'+name+'.json';if(pins.rawAndMaterials.some(e=>e.member===member))metadata[name]=JSON.parse(original(member));
}
const backdrop=[32,48,64,255];
function plane(height){const p=new PNG({width:200,height});for(let i=0;i<p.data.length;i+=4)p.data.set(backdrop,i);return p;}
function binaryAsset(name){const a=images[name];assert(a);for(let i=3;i<a.data.length;i+=4)assert(a.data[i]===0||a.data[i]===255);checks.push({check:'binary-alpha',asset:name,pixels:a.width*a.height});}
for(const n of['loading_spin','auto_save','experiencebarfull','experiencebarempty','progress_bar_simple'])binaryAsset(n);
function nearest(n,d){assert.equal(Number.isInteger(n)&&Number.isInteger(d),true);assert(n>=0&&d>0);assert.notEqual((n%d)*2,d,'no exact half quantization tie');return Math.floor(n/d+.5);}
function paint(p,dx,dy,source,sx,sy,tint=[1,1,1],den=1){
 const si=(sy*source.width+sx)*4,di=(dy*p.width+dx)*4,a=source.data[si+3];assert(a===0||a===255);if(!a)return;
 p.data.set([nearest(source.data[si]*tint[0],den),nearest(source.data[si+1]*tint[1],den),nearest(source.data[si+2]*tint[2],den),255],di);
}
function sprite(p,name,frame,step,uvSize,box){const a=images[name],[x,y,w,h]=box,[sw,sh]=uvSize;assert(frame*step+sw<=a.width&&sh<=a.height);for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)paint(p,x+dx,y+dy,a,frame*step+Math.floor((2*dx+1)*sw/(2*w)),Math.floor((2*dy+1)*sh/(2*h)));}
function axis(pixel,destination,source,lo,hi){
 // Source pixel centres pulled through independent exact interval mapper.
 if(lo>0&&pixel<lo)return Math.floor((2*pixel+1)*lo/(2*lo));
 if(hi>0&&pixel>=destination-hi)return source-hi+Math.floor((2*(pixel-(destination-hi))+1)*hi/(2*hi));
 const src=source-lo-hi,dst=destination-lo-hi;assert(src>0&&dst>0);return lo+Math.floor((2*(pixel-lo)+1)*src/(2*dst));
}
function nine(p,name,box,{clipWidth=box[2],tint=[1,1,1],den=1}={}){const a=images[name],m=metadata[name],cuts=m.nineslice_size,[x,y,w,h]=box;assert.deepEqual(m.base_size,[a.width,a.height]);const [l,t,r,b]=Array.isArray(cuts)?cuts:[cuts,cuts,cuts,cuts];for(let dy=0;dy<h;dy++)for(let dx=0;dx<w&&dx<clipWidth;dx++)paint(p,x+dx,y+dy,a,axis(dx,w,a.width,l,r),axis(dy,h,a.height,t,b),tint,den);}
const cases=[];
for(const frame of[0,5,9])cases.push({id:'spinner-f'+frame,template:'spinner',kind:'spinner',height:100,frame,box:[93,67,14,14],source:'progress.progress_loading_spinner',render:p=>sprite(p,'loading_spin',frame,7,[7,7],[93,67,14,14])});
for(const frame of[0,4,8])cases.push({id:'autosave-f'+frame,template:'autosave',kind:'autosave',height:100,frame,box:[91,55,18,30],source:'progress.auto_save',render:p=>sprite(p,'auto_save',frame,18,[18,30],[91,55,18,30])});
for(const ratio of[0,.5,1]){
 cases.push({id:'fancy-r'+String(ratio).replace('.','_'),template:'fancy',kind:'fancy',height:101,ratio,box:[10,48,180,5],source:'progress.fancy_progress_loading_bars',isolation:{paint:'nub only visibility:hidden; keep box and all siblings',sourceControl:'progress.progress_bar_nub',box:[15,48,170,5]},render:p=>{nine(p,'experiencebarempty',[10,48,180,5]);nine(p,'experiencebarfull',[10,48,180,5],{clipWidth:180*ratio});}});
 cases.push({id:'thick-r'+String(ratio).replace('.','_'),template:'thick',kind:'thick',height:100,ratio,box:[10,43,180,14],source:'progress.thick_progress_bar',render:p=>{nine(p,'progress_bar_simple',[10,43,180,14],{tint:[240,240,240],den:1000});nine(p,'progress_bar_simple',[10,43,180,14],{clipWidth:180*ratio,tint:[263,627,109],den:1000});}});
}
const planes=[];
for(const c of cases){const png=plane(c.height);c.render(png);const bytes=PNG.sync.write(png),file=out+'/EXPECTED/'+c.id+'.png';fs.writeFileSync(file,bytes);assert.equal(png.data.every((v,i)=>i%4!==3||v===255),true);const{render,...data}=c;planes.push({...data,targetSelector:`[data-progress-template="${c.template}"][data-progress-kind="${c.kind}"]`,pixelSize:[200,c.height],backdrop,threshold:0,tolerance:0,wholePNG:{path:file,bytes:bytes.length,sha256:hash(bytes)},wholeRGBA_SHA256:hash(png.data)});checks.push({check:'complete-opaque-plane',id:c.id,pixels:png.width*png.height});}
const scan={};for(const name of['loading_bar','experiencenub']){const a=images[name];let opaque=0,partial=0,transparent=0;for(let i=3;i<a.data.length;i+=4){if(a.data[i]===255)opaque++;else if(a.data[i]===0)transparent++;else partial++;}scan[name]={size:[a.width,a.height],opaque,partial,transparent};}
fs.writeFileSync(out+'/ORIGINALS.json',JSON.stringify(originals,null,2)+'\n');
fs.writeFileSync(out+'/PLANES.json',JSON.stringify({planes,diagnosticOnly:scan},null,2)+'\n');
fs.writeFileSync(out+'/CPU-CHECKS.json',JSON.stringify({checks,sourceFilesIndependentlyPinned:originals.length,caseCount:planes.length,halfTieForbiddenInQualifiedPlanes:true,productionHelpersReadOrImported:false,browserMeasured:false},null,2)+'\n');
console.log(JSON.stringify({planes:planes.length,sourceFiles:originals.length,checks:checks.length,diagnosticOnly:scan}));
