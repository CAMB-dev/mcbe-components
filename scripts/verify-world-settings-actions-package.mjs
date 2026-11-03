import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

/** Actual independently installed package; never aliases the repository source. */
export async function verifyWorldSettingsActionsPackage({consumer,root,major,evidenceName}){
  const evidence=path.join(consumer,evidenceName??`world-settings-actions-${Date.now()}`);
  await fs.mkdir(evidence);
  const worker=path.join(evidence,'worker.mjs');
  await fs.writeFile(worker,String.raw`import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import path from 'node:path';import{createHash}from'node:crypto';import{createRequire}from'node:module';import{pathToFileURL}from'node:url';
const config=JSON.parse(await fs.readFile(process.argv[2],'utf8')),req=createRequire(path.join(config.consumer,'package.json'));
const React=req('react'),ssr=req('react-dom/server').renderToStaticMarkup,pkg=path.join(config.consumer,'node_modules/mcbeui'),ui=await import(pathToFileURL(path.join(pkg,'dist/index.js')).href);
assert.equal(Number(React.version.split('.')[0]),config.major);assert.equal(Object.keys(ui).length,288);
for(const name of ['WorldSettingsActionButton','WorldLaunchActions'])assert.equal(ui[name].$$typeof,Symbol.for('react.forward_ref'));
for(const name of ['worldActionAssets','frame','snapshotFont','skinBank'])assert(!Object.hasOwn(ui,name));
let callbacks=0;const warnings=[],oldError=console.error,oldWarn=console.warn;console.error=(...args)=>warnings.push(args.join(' '));console.warn=console.error;
const checks=[],font={family:'monospace',size:10,lineHeight:10},button={label:'Host <label>',enabled:true,labelMaxHeight:10};
for(const edition of ['bedrock','education'])for(const mode of ['create','template-create','edit']){
 const model=edition==='bedrock'?{edition,mode,pregame:true,editor:false,primary:button,realms:{...button,visible:true}}:{edition,mode,pregame:true,play:button,host:button};
 const props={width:260,scale:1,font,model,hiddenSlots:'collapse',onAction:()=>callbacks++,ref:()=>callbacks++};
 const html=ssr(React.createElement(ui.WorldLaunchActions,props));assert(html.includes('Host &lt;label&gt;'));assert.equal((html.match(/<button /g)||[]).length,2);
 const target=edition==='bedrock'?(mode==='edit'?'play_world_button':'create_world_button'):(mode==='edit'?'play_world_edu_button':'create_world_edu_button');assert(html.includes('data-source-target="'+target+'"'));
 if(edition==='education'){assert(html.includes('data-should-host="false"'));assert(html.includes('data-should-host="true"'));}
 assert.equal(ssr(React.createElement(ui.WorldLaunchActions,{...props,model:{...model,pregame:false}})),'');
 assert(ssr(React.createElement(ui.WorldLaunchActions,{...props,inert:true})).includes('inert=""'));
 checks.push(edition+'-'+mode);
}
for(const tone of ['light','dark','realms']){
 const html=ssr(React.createElement(ui.WorldSettingsActionButton,{size:[130,30],scale:2,font,label:'Copy',target:'copy_world_button',tone,labelMaxHeight:10,inert:true,disabled:true,onAction:()=>callbacks++,ref:()=>callbacks++}));
 assert(html.includes('inert=""')&&html.includes('disabled=""')&&html.includes('copy_world_button'));checks.push('source-tone-'+tone);
}
console.error=oldError;console.warn=oldWarn;assert.deepEqual(warnings,[]);assert.equal(callbacks,0);
const sha=b=>createHash('sha256').update(b).digest('hex'),manifest=JSON.parse(await fs.readFile(path.join(config.root,'docs/world-settings-assets.json'),'utf8')),materials=[];
for(const [key,asset]of Object.entries(manifest.assets))for(const leaf of [asset,asset.metadata]){
 const relative=leaf.file.replace(/^src\//,'dist/'),bytes=await fs.readFile(path.join(pkg,relative));assert.equal(sha(bytes),leaf.sha256);materials.push({key,path:relative,sha256:sha(bytes)});
}
assert.deepEqual(await fs.readFile(path.join(pkg,'dist/world-settings-actions.css')),await fs.readFile(path.join(config.root,'src/world-settings-actions.css')));
assert.deepEqual(await fs.readFile(path.join(pkg,'dist/assets/world-settings/LICENSE.md')),await fs.readFile(path.join(config.root,'src/assets/world-settings/LICENSE.md')));
const report={status:'PASS_INSTALLED_WORLD_ACTIONS_SSR_MATERIALS_TYPES_PENDING',react:React.version,runtimeValues:288,checks,callbacks,warnings,materials};
await fs.writeFile(path.join(config.evidence,'RESULT.json'),JSON.stringify(report,null,2)+'\n');
`);
  const config=path.join(evidence,'config.json');
  await fs.writeFile(config,JSON.stringify({consumer,root,major,evidence}));
  try {execFileSync(process.execPath,[worker,config],{cwd:consumer,stdio:'pipe',encoding:'utf8'});}
  catch(error){await fs.writeFile(path.join(evidence,'worker-error.log'),String(error.stdout??'')+String(error.stderr??''));throw error;}
  const fixture=`import React from 'react';
import {WorldSettingsActionButton,WorldLaunchActions} from 'mcbeui';
import type {WorldLaunchModel,WorldLaunchActionDetail} from 'mcbeui';
const font={family:'monospace',size:10,lineHeight:10},state={label:'Host',enabled:true,labelMaxHeight:10};
const model:WorldLaunchModel={edition:'bedrock',mode:'create',pregame:true,editor:false,primary:state,realms:{...state,visible:true}};
const launch={width:260,scale:1,font,model,hiddenSlots:'collapse' as const};
const action={size:[130,30] as const,scale:1,font,label:'Host',target:'copy_world_button',tone:'light' as const,labelMaxHeight:10};
export const valid=<><WorldLaunchActions {...launch} inert ref={React.createRef<HTMLDivElement>()} buttonRefs={{primary:React.createRef<HTMLButtonElement>()}} onAction={(detail:WorldLaunchActionDetail)=>{const target:string=detail.target;void target;}}/><WorldSettingsActionButton {...action} inert ref={React.createRef<HTMLButtonElement>()}/></>;
// @ts-expect-error source editions are explicit
const badEdition:WorldLaunchModel={...model,edition:'java'};
// @ts-expect-error source modes do not contain hardcore
const badMode:WorldLaunchModel={...model,mode:'hardcore'};
// @ts-expect-error Bedrock requires independent Realms state
const missingRealm:WorldLaunchModel={edition:'bedrock',mode:'edit',pregame:true,editor:false,primary:state};
// @ts-expect-error EDU requires both source buttons
const missingHost:WorldLaunchModel={edition:'education',mode:'edit',pregame:true,play:state};
// @ts-expect-error source skin tone
export const badTone=<WorldSettingsActionButton {...action} tone="green"/>;
// @ts-expect-error integer scale is numeric
export const badScale=<WorldLaunchActions {...launch} scale="2"/>;
// @ts-expect-error labels are provided through the source text binding
export const badChildren=<WorldSettingsActionButton {...action}>Other</WorldSettingsActionButton>;
// @ts-expect-error fixed source launch controls
export const badLaunchChildren=<WorldLaunchActions {...launch}>Other</WorldLaunchActions>;
// @ts-expect-error target is source text
export const badTarget=<WorldSettingsActionButton {...action} target={2}/>;
// @ts-expect-error resolved source label is text
export const badLabel=<WorldSettingsActionButton {...action} label={<b>Host</b>}/>;
void badEdition;void badMode;void missingRealm;void missingHost;
`;
  await fs.writeFile(path.join(evidence,'types.tsx'),fixture);
  await fs.writeFile(path.join(evidence,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,jsx:'react-jsx',target:'ES2022',module:'NodeNext',moduleResolution:'NodeNext',skipLibCheck:false},files:['types.tsx']}));
  const tsc=path.join(root,'node_modules/typescript/bin/tsc');
  try {execFileSync(process.execPath,[tsc,'-p',path.join(evidence,'tsconfig.json')],{cwd:consumer,stdio:'pipe',encoding:'utf8'});}
  catch(error){await fs.writeFile(path.join(evidence,'types-error.log'),String(error.stdout??'')+String(error.stderr??''));throw error;}
  const result=JSON.parse(await fs.readFile(path.join(evidence,'RESULT.json'),'utf8'));
  result.status='PASS_INSTALLED_WORLD_ACTIONS_SSR_TYPES_MATERIALS';
  result.strictInstalledTypes=true;result.negativeTypes=10;
  await fs.writeFile(path.join(evidence,'RESULT.json'),JSON.stringify(result,null,2)+'\n');
  console.log(`React ${major}: installed World actions 9 SSR groups /10 negative types /6 whole PNGs and raw metadata PASS`);
}
