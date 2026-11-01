import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const fixtures=fileURLToPath(new URL('./fixtures/progress-package/',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
/** Already-installed peer only. No install/network/server/browser. Root's
 * normal verifier owns tar installation and the surrounding package checks. */
export async function verifyProgressPackage({consumer,root,major}){
 assert(major===18||major===19,'Expected React major18 or19');consumer=path.resolve(consumer);root=path.resolve(root);
 await fs.access(path.join(consumer,'package.json'));
 const directory=path.join(consumer,'progress-contracts');await fs.mkdir(directory,{recursive:true});
 for(const name of['model.ts','consumer.tsx'])await fs.copyFile(path.join(fixtures,name),path.join(directory,name));
 await fs.writeFile(path.join(directory,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',lib:['ES2022','DOM','DOM.Iterable'],module:'ESNext',moduleResolution:'Bundler',jsx:'react-jsx',strict:true,noEmit:true,skipLibCheck:true,esModuleInterop:true},include:['model.ts','consumer.tsx']},null,2));
 const config=path.join(directory,'config.json');await fs.writeFile(config,JSON.stringify({consumer,root,major,directory,materials:path.join(fixtures,'materials.json')},null,2));
 const run=async(args,name)=>{try{const stdout=execFileSync(process.execPath,args,{cwd:consumer,encoding:'utf8',maxBuffer:24*1024*1024});await fs.writeFile(path.join(directory,name),stdout);}catch(error){await fs.writeFile(path.join(directory,name),String(error.stdout??'')+'\n'+String(error.stderr??error.stack));throw error;}};
 await run([path.join(fixtures,'worker.mjs'),config],'SSR.txt');
 await run([path.join(root,'node_modules/typescript/bin/tsc'),'--project',path.join(directory,'tsconfig.json')],'TYPECHECK.txt');
 const details=JSON.parse(await fs.readFile(path.join(directory,'SSR.json'),'utf8'));
 const result={...details,status:'PASS_INSTALLED_PROGRESS_ESM_SSR_TYPES_ASSETS_CSS',strictTypes:true,fixtureSHA256:Object.fromEntries(await Promise.all(['model.ts','consumer.tsx'].map(async name=>[name,hash(await fs.readFile(path.join(directory,name)))]))),scope:'Actual installed peer ESM/SSR/public declarations/source materials/CSS. No mounted browser/default-Vite or native GUI claim.'};
 await fs.writeFile(path.join(directory,'RESULT.json'),JSON.stringify(result,null,2));
 console.log(`React ${major}: installed Progress ${details.checks.length} SSR contracts / strict types / ${details.materials} whole PNGs / ${details.metadata} raw metadata / ${details.publicCSS.length} CSS entries PASS`);
 return result;
}
