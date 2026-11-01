import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url)),runId=process.argv[3]??'qualification-02';
assert(/^[a-z0-9-]{1,40}$/.test(runId),'Use a bounded run id');
const out=path.join(root,'.cache/progress-public-01/default-vite-'+runId);
const inputTar=path.resolve(process.argv[2]??path.join(root,'mcbeui-0.1.0.tgz')),tar=path.join(out,'candidate.tgz'),npm=process.env.npm_execpath;
assert(npm,'Run through npm run verify:progress:browser');
const vite=path.join(root,'node_modules/vite/bin/vite.js');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
await mkdir(out,{recursive:true});
// Freeze the exact tested tar before installation; another build may repack
// the repository's default filename while this four-case matrix is running.
if(inputTar!==tar)await copyFile(inputTar,tar);
const receipt={inputTar,tar,tarSHA256:sha(await readFile(tar)),matrix:[],servers:[],nativeCertified:false};
const execute=(args,cwd)=>execFileSync(process.execPath,args,{cwd,encoding:'utf8',maxBuffer:16*1024*1024,windowsHide:true});
async function server(cwd,port,production){
 const child=spawn(process.execPath,[vite,...production?['preview']:[], '--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd,windowsHide:true,stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});
 const detail={pid:child.pid,port,production,cwd,closed:false};receipt.servers.push(detail);
 await writeFile(path.join(out,'LIVE.json'),JSON.stringify(receipt,null,2));
 const url=`http://127.0.0.1:${port}/`,deadline=Date.now()+20000;
 try{
  while(Date.now()<deadline){if(child.exitCode!==null||child.signalCode!==null)throw Error('Vite exited: '+output);try{const response=await fetch(url);if(response.ok)return{url,stop:async()=>{if(child.exitCode===null&&child.signalCode===null){const closed=new Promise(resolve=>child.once('exit',resolve));child.kill();await closed;}detail.closed=true;await writeFile(path.join(out,`server-${port}.log`),output);}};}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
  throw Error('Vite readiness timed out: '+output);
 }catch(error){if(child.exitCode===null)child.kill();throw error;}
}
const app=`import React,{createRef,useState} from 'react';
import{createRoot}from'react-dom/client';
import*as ui from'mcbeui';import{makeProgressProps}from'./model';
import'mcbeui/progress-screen.css';import'mcbeui/progress-public-parts.css';import'mcbeui/progress-indicators.css';import'mcbeui/fonts.css';
const names=['ProgressScreen','ProgressIndicators','ProgressPackGrids','ProgressResourceDialog','ProgressCloudPanel','ProgressCloudConflictDialog'];
const refs=Object.fromEntries(names.map(name=>[name,createRef()]));
function App(){const[stage,setStage]=useState(null),[selected,setSelected]=useState(true),[log,setLog]=useState([]);const p=makeProgressProps();p.profile={...p.profile,fonts:Object.fromEntries(Object.entries(p.profile.fonts).map(([role,f])=>[role,{...f,family:'"MCBE Pixel", "MCBE CJK", monospace'}]))};
p.bindings={...p.bindings,cancelVisible:true,ttsEnabled:false};p.onAction=d=>{setLog(l=>[...l,d.target]);setStage(null);};p.onPackSelectionChange=d=>setSelected(d.selected);p.packs={...p.packs,optional:{...p.packs.optional,entries:p.packs.optional.entries.map((e,i)=>i===0?{...e,selected}:e)}};
const popup={instanceId:'installed-packs',factoryId:stage==='simple'?'resource_pack_download_required':'test',description:'Installed packs',showRayTracingWarning:false,rayTracingWarning:'',joinEverythingText:'All',joinRequiredText:'Required'};
const conflict={instanceId:'installed-conflict',description:'Choose installed version',localName:'Local',localDate:'Local date',cloudName:'Cloud',cloudDate:'Cloud date'};
window.progressInstalled={react:React.version,names,runtimeValues:Object.keys(ui).length,refs,log,stage};
return <><div id="controls">{['screen','resource','simple','cloud','conflict'].map(kind=><button key={kind} id={'open-'+kind} onClick={()=>setStage(kind)}>Open {kind}</button>)}</div>
<ui.ProgressIndicators key="indicators" ref={refs.ProgressIndicators} templates={['spinner','fancy','autosave']} state={p.indicators} availableSize={[300,100]} scale={1} imageClipPolicy="visible-fraction-web" customBar={p.profile.customBar} label="Installed indicators"/>
<ui.ProgressPackGrids key="grids" ref={refs.ProgressPackGrids} runKey="installed" instanceId="grid" packs={p.packs} profile={p.profile} size={[430,100]} disabled={false} readOnly={false} onSelectionChange={d=>setSelected(d.selected)}/>
<ui.ProgressScreen key="screen" {...p} ref={refs.ProgressScreen} open={stage==='screen'}/>
<ui.ProgressResourceDialog key="resource" ref={refs.ProgressResourceDialog} snapshot={{...p,open:stage==='resource'||stage==='simple'}} popup={popup}/>
<ui.ProgressCloudPanel key="cloud" ref={refs.ProgressCloudPanel} snapshot={{...p,open:stage==='cloud',cloud:{...p.cloud,uploadError:true,linkVisible:false}}} kind="upload" imageClipPolicy="visible-fraction-web"/>
<ui.ProgressCloudConflictDialog key="conflict" ref={refs.ProgressCloudConflictDialog} snapshot={{...p,open:stage==='conflict',conflictPopup:conflict}}/>
<output id="requests">{log.join('|')}</output></>}
createRoot(document.getElementById('root')).render(<App/>);`;
const browser=await chromium.launch();
try{
 for(const [major,version]of [[18,'18.3.1'],[19,'19.3.1']]){
  const cwd=path.join(out,'react'+major);await mkdir(cwd,{recursive:true});
  await writeFile(path.join(cwd,'package.json'),JSON.stringify({name:'progress-browser-consumer',version:'1.0.0',private:true,type:'module'},null,2));
  await writeFile(path.join(cwd,'INSTALL.log'),execute([npm,'install','--ignore-scripts','--no-audit','--no-fund','--prefer-offline',tar,'react@'+version,'react-dom@'+version],cwd));
  await copyFile(path.join(root,'scripts/fixtures/progress-package/model.ts'),path.join(cwd,'model.ts'));
  await writeFile(path.join(cwd,'main.tsx'),app);
  await writeFile(path.join(cwd,'index.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><title>Installed Progress</title><style>body{margin:0;background:#203040;color:white;font-family:"MCBE Pixel","MCBE CJK",monospace}button{font:inherit}#root{position:relative}</style><div id="root"></div><script type="module" src="/main.tsx"></script></html>');
  for(const production of [false,true]){
   if(production)await writeFile(path.join(cwd,'BUILD.log'),execute([vite,'build'],cwd));
   const port=5420+(major-18)*2+Number(production),handle=await server(cwd,port,production),context=await browser.newContext({viewport:{width:1100,height:900}}),page=await context.newPage();
   const errors=[],badHTTP=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))badHTTP.push([r.status(),r.url()]);});
   try{
    await page.goto(handle.url);await page.waitForFunction(()=>window.progressInstalled?.refs.ProgressScreen.current);
    await page.evaluate(async()=>{await document.fonts.load('10px "MCBE Pixel"','Loading');await document.fonts.load('12px "MCBE CJK"','加载');await document.fonts.ready;});
    const metadata=await page.evaluate(()=>({react:window.progressInstalled.react,runtimeValues:window.progressInstalled.runtimeValues,refs:Object.fromEntries(Object.entries(window.progressInstalled.refs).map(([k,r])=>[k,!!r.current?.isConnected])),fonts:[...document.fonts].filter(f=>['MCBE Pixel','MCBE CJK'].includes(f.family)).map(f=>({family:f.family,status:f.status}))}));
    assert.equal(metadata.react,version);assert.equal(metadata.runtimeValues,220);assert(Object.values(metadata.refs).every(Boolean));assert.equal(metadata.fonts.length,2);assert(metadata.fonts.every(f=>f.status==='loaded'));
    const toggle=page.locator('[data-progress-part="pack-grids"] input[name="optional_resourcepacks"]').first(),before=await toggle.isChecked();await toggle.click();await page.waitForFunction(previous=>document.querySelector('[data-progress-part="pack-grids"] input[name="optional_resourcepacks"]').checked!==previous,before);
    for(const stage of ['screen','resource','simple','cloud','conflict']){
     await page.locator('#open-'+stage).click();
     if(stage==='cloud')await page.locator('[data-progress-part="cloud-panel"] [data-source-target="button.menu_exit"]').click();
     else await page.keyboard.press('Escape');
     await page.waitForFunction(()=>window.progressInstalled.stage===null);
    }
    const log=await page.evaluate(()=>window.progressInstalled.log);assert.deepEqual(log,['button.menu_exit','modal.escape','modal.escape','button.menu_exit','button.close_edu_cloud_conflict_resolution_popup']);
    await page.screenshot({path:path.join(out,`react${major}-${production?'production':'development'}.png`)});
    assert.deepEqual(errors,[]);assert.deepEqual(badHTTP,[]);
    receipt.matrix.push({major,production,status:'PASS',metadata,actions:log,errors,badHTTP,scope:'Default Vite with actual npm-installed tar and peer; six mounted refs, controlled selection, real fonts, five source actions including both resource factory bases. No source alias, optimizer override, or native GUI claim.'});
   }finally{await context.close();await handle.stop();await writeFile(path.join(out,'RESULT.json'),JSON.stringify(receipt,null,2));}
  }
 }
}finally{await browser.close();await writeFile(path.join(out,'RESULT.json'),JSON.stringify(receipt,null,2));}
assert.equal(receipt.matrix.length,4);assert(receipt.servers.every(s=>s.closed));console.log(JSON.stringify({tarSHA256:receipt.tarSHA256,matrix:receipt.matrix.map(r=>({major:r.major,production:r.production,status:r.status})),allOwnedServersClosed:true},null,2));
