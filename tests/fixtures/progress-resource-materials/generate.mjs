import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {fileURLToPath} from 'node:url';

// Source-only independent oracle. Never import production renderers or helpers.
const destination=fileURLToPath(new URL('./',import.meta.url));
const study=path.resolve('.cache/progress-source-study-02');
const sourcePins=JSON.parse(fs.readFileSync(path.join(study,'SOURCE-PINS.json'),'utf8'));
const studyFinal=JSON.parse(fs.readFileSync(path.join(study,'FINAL.json'),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
if(fs.existsSync(path.join(destination,'FROZEN.json')))throw Error('Frozen fixture must not be regenerated from measurements');
const originals=[];
function copy(member){
 const bytes=fs.readFileSync(path.join(study,'ORIGINALS',member));
 const pin=sourcePins.rawAndMaterials.find(entry=>entry.member===member);
 if(pin){assert.equal(bytes.length,pin.bytes);assert.equal(hash(bytes),pin.sha256);}
 else{assert.equal(member,'LICENSE.md');assert.equal(hash(bytes),studyFinal.files['ORIGINALS/LICENSE.md']);}
 const output=path.join(destination,'ORIGINALS',member);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,bytes);
 originals.push({member,path:'ORIGINALS/'+member,bytes:bytes.length,sha256:hash(bytes)});return bytes;
}
const frameBytes=copy('resource_pack/textures/ui/dialog_background_hollow_3.png');
const frameMetadataBytes=copy('resource_pack/textures/ui/dialog_background_hollow_3.json');
const controlBytes=copy('resource_pack/textures/ui/control.png');
copy('resource_pack/textures/ui/control.json');
copy('resource_pack/ui/progress_screen.json');copy('resource_pack/ui/ui_common.json');copy('LICENSE.md');
const frame=PNG.sync.read(frameBytes),metadata=JSON.parse(frameMetadataBytes),control=PNG.sync.read(controlBytes);
assert.deepEqual([frame.width,frame.height],[18,33]);assert.deepEqual(metadata.base_size,[18,33]);assert.deepEqual(metadata.nineslice_size,[8,23,8,8]);
assert.deepEqual([control.width,control.height],[2,2]);for(let i=0;i<control.data.length;i+=4)assert.deepEqual([...control.data.subarray(i,i+4)],[9,9,9,255]);
for(let i=3;i<frame.data.length;i+=4)assert(frame.data[i]===0||frame.data[i]===255);
const width=500,height=301,windowBox=[125,46,250,209],backdrop=[32,48,64,255];
const expected=new PNG({width,height});for(let i=0;i<expected.data.length;i+=4)expected.data.set(backdrop,i);
// Source control is uniform: stretching its whole original cannot change RGB.
// Its degenerate centre metadata is retained, never repaired or rewritten.
for(let y=46;y<46+209;y++)for(let x=125+8;x<125+250-8;x++)expected.data.set(control.data.subarray(0,4),(y*width+x)*4);
function pull(pixel,destinationSize,sourceSize,leading,trailing){
 let destinationStart=0,sourceStart=0,destinationLength=leading,sourceLength=leading;
 if(pixel>=destinationSize-trailing){destinationStart=destinationSize-trailing;sourceStart=sourceSize-trailing;destinationLength=sourceLength=trailing;}
 else if(pixel>=leading){destinationStart=leading;sourceStart=leading;destinationLength=destinationSize-leading-trailing;sourceLength=sourceSize-leading-trailing;}
 assert(destinationLength>0&&sourceLength>0);
 return sourceStart+Math.floor(((pixel-destinationStart)*2+1)*sourceLength/(2*destinationLength));
}
for(let y=0;y<209;y++)for(let x=0;x<250;x++){
 const sx=pull(x,250,18,8,8),sy=pull(y,209,33,23,8),index=(sy*18+sx)*4;
 if(frame.data[index+3]===255)expected.data.set(frame.data.subarray(index,index+4),((46+y)*width+125+x)*4);
}
const expectedFile='simple-window-500x301-s1.png',expectedBytes=PNG.sync.write(expected);
fs.writeFileSync(path.join(destination,expectedFile),expectedBytes);
const result={host:[width,height],windowBox,fillBox:[133,46,234,209],backdrop,pixelCount:width*height,PNG:{path:expectedFile,bytes:expectedBytes.length,sha256:hash(expectedBytes)},wholeRGBA_SHA256:hash(expected.data),originals};
fs.writeFileSync(path.join(destination,'EXPECTED.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(destination,'SOURCE-PINS.json'),JSON.stringify({fixedArchive:sourcePins.archive,studyFinalSHA256:hash(fs.readFileSync(path.join(study,'FINAL.json'))),originals},null,2)+'\n');
console.log(JSON.stringify({pixelCount:result.pixelCount,PNG:result.PNG,wholeRGBA_SHA256:result.wholeRGBA_SHA256,originals:originals.length}));
