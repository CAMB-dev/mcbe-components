import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url)),runId=process.argv[3]??'qualification-01';
assert(/^[a-z0-9-]{1,40}$/.test(runId),'Use a bounded run id');
const out=path.join(root,'.cache/file-transmission-public-01/default-vite-'+runId);
const inputTar=path.resolve(process.argv[2]??path.join(root,'mcbeui-0.1.0.tgz')),tar=path.join(out,'candidate.tgz'),npm=process.env.npm_execpath;
assert(npm,'Run through npm run verify:file-transmission:browser');
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
const app=`import React,{createRef,useRef,useState}from'react';import{createRoot}from'react-dom/client';import*as ui from'mcbeui';import{makeFileTransmissionModel}from'./model';import'mcbeui/file-transmission.css';import'mcbeui/fonts.css';
const names=['FileTransmissionScreen','FileTransmissionPanel','FileTransferProgress'],refs=Object.fromEntries(names.map(name=>[name,createRef()]));
function App(){const[open,setOpen]=useState(false),[percentage,setPercentage]=useState(.25),[readOnly,setReadOnly]=useState(false),[actions,setActions]=useState([]);const controller=useRef(null),base=makeFileTransmissionModel(),model={...base,readOnly,bindings:{...base.bindings,singleTitleVisible:true,dualTitleVisible:false,uploadContentVisible:true,warningContentVisible:false,playVisible:false,cancelVisible:true,warningButtonsVisible:false,percentage},profile:{...base.profile,fonts:Object.fromEntries(Object.entries(base.profile.fonts).map(([key,f])=>[key,{...f,family:'"MCBE Pixel", "MCBE CJK", monospace'}]))}};
window.fileTransmissionInstalled={react:React.version,runtimeValues:Object.keys(ui).length,refs,open,actions,controller,percentage};
return <><button id="open" onClick={()=>setOpen(true)}>Open installed transfer</button><button id="set-half" onClick={()=>setPercentage(.5)}>Set half</button><label>Readonly<input id="readonly" type="checkbox" checked={readOnly} onChange={e=>setReadOnly(e.currentTarget.checked)}/></label>
<ui.FileTransferProgress key="progress" ref={refs.FileTransferProgress} width={248} scale={1} percentage={percentage} visible={true} imageClipPolicy="visible-fraction-web" label="Installed progress"/>
<div id="standalone-panel"><ui.FileTransmissionPanel key="panel" ref={refs.FileTransmissionPanel} model={{...model,onAction:d=>setActions(a=>[...a,'panel:'+d.target])}}/></div>
<ui.FileTransmissionScreen key="screen" ref={refs.FileTransmissionScreen} model={{...model,onAction:d=>{setActions(a=>[...a,'screen:'+d.target]);setOpen(false);}}} open={open} label="Installed file transfer" baseLayer={null} titleArt={null} controllerRef={controller}/><output>{actions.join('|')}</output></>}
createRoot(document.getElementById('root')).render(<App/>);`;
const browser=await chromium.launch();
try{
 for(const[major,version]of[[18,'18.3.1'],[19,'19.3.1']]){
  const cwd=path.join(out,'react'+major);await mkdir(cwd,{recursive:true});await writeFile(path.join(cwd,'package.json'),JSON.stringify({name:'file-transmission-browser-consumer',version:'1.0.0',private:true,type:'module'},null,2));
  await writeFile(path.join(cwd,'INSTALL.log'),execute([npm,'install','--ignore-scripts','--no-audit','--no-fund','--prefer-offline',tar,'react@'+version,'react-dom@'+version],cwd));
  await copyFile(path.join(root,'scripts/fixtures/file-transmission-package/model.ts'),path.join(cwd,'model.ts'));await writeFile(path.join(cwd,'main.tsx'),app);
  await writeFile(path.join(cwd,'index.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><title>Installed file transmission</title><style>body{margin:0;background:#203040;color:white;font-family:"MCBE Pixel","MCBE CJK",monospace}button{font:inherit}</style><div id="root"></div><script type="module" src="/main.tsx"></script></html>');
  for(const production of[false,true]){
   if(production)await writeFile(path.join(cwd,'BUILD.log'),execute([vite,'build'],cwd));
   const port=5424+(major-18)*2+Number(production),handle=await server(cwd,port,production),context=await browser.newContext({viewport:{width:1100,height:900}}),page=await context.newPage(),errors=[],badHTTP=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))badHTTP.push([r.status(),r.url()]);});
   try{
    await page.goto(handle.url);await page.waitForFunction(()=>window.fileTransmissionInstalled?.refs.FileTransmissionScreen.current);
    await page.evaluate(async()=>{await document.fonts.load('10px "MCBE Pixel"','Transfer');await document.fonts.load('10px "MCBE CJK"','文件');await document.fonts.ready;});
    const metadata=await page.evaluate(()=>{const x=window.fileTransmissionInstalled;return{react:x.react,runtimeValues:x.runtimeValues,refs:Object.fromEntries(Object.entries(x.refs).map(([key,r])=>[key,!!r.current?.isConnected])),fonts:[...document.fonts].filter(f=>['MCBE Pixel','MCBE CJK'].includes(f.family)).map(f=>({family:f.family,status:f.status})),panel:[x.refs.FileTransmissionPanel.current.offsetWidth,x.refs.FileTransmissionPanel.current.offsetHeight],bar:[x.refs.FileTransferProgress.current.offsetWidth,x.refs.FileTransferProgress.current.offsetHeight]};});
    assert.equal(metadata.react,version);assert.equal(metadata.runtimeValues,223);assert(Object.values(metadata.refs).every(Boolean));assert.equal(metadata.fonts.length,2);assert(metadata.fonts.every(f=>f.status==='loaded'));assert.deepEqual(metadata.panel,[268,95]);assert.deepEqual(metadata.bar,[248,5]);
    await page.locator('#set-half').click();await page.waitForFunction(()=>window.fileTransmissionInstalled.percentage===.5);assert.equal(await page.locator('.mc-file-transfer-progress__full').first().evaluate(n=>n.style.clipPath),'inset(0px 50% 0px 0px)');
    await page.locator('#standalone-panel [data-file-transmission-button="cancel"]').click();await page.waitForFunction(()=>window.fileTransmissionInstalled.actions.length===1);
    await page.locator('#open').click();await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.fileTransmissionInstalled.open);assert(await page.locator('#open').evaluate(n=>n===document.activeElement));
    await page.locator('#readonly').check();await page.locator('#open').click();await page.locator('.mc-file-transmission-screen [data-file-transmission-button="cancel"]').click({force:true});await page.waitForTimeout(25);assert.equal(await page.evaluate(()=>window.fileTransmissionInstalled.actions.length),2);await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.fileTransmissionInstalled.open);
    const log=await page.evaluate(()=>window.fileTransmissionInstalled.actions);assert.deepEqual(log,['panel:button.file_upload_cancel','screen:button.menu_exit','screen:button.menu_exit']);
    await page.screenshot({path:path.join(out,`react${major}-${production?'production':'development'}.png`)});assert.deepEqual(errors,[]);assert.deepEqual(badHTTP,[]);
    receipt.matrix.push({major,production,status:'PASS',metadata,actions:log,errors,badHTTP,scope:'Actual installed tar/default Vite,3mounted refs,268x95panel/248x5bar,controlled ratio,source action,readonly native-control veto with independent Escape,focus restoration and two real open fonts. No native GUI claim.'});
   }finally{await context.close();await handle.stop();await writeFile(path.join(out,'RESULT.json'),JSON.stringify(receipt,null,2));}
  }
 }
}finally{await browser.close();await writeFile(path.join(out,'RESULT.json'),JSON.stringify(receipt,null,2));}
assert.equal(receipt.matrix.length,4);assert(receipt.servers.every(s=>s.closed));console.log(JSON.stringify({tarSHA256:receipt.tarSHA256,matrix:receipt.matrix.map(r=>({major:r.major,production:r.production,status:r.status})),allOwnedServersClosed:true},null,2));
