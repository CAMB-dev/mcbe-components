import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';
import { PNG } from 'pngjs';
const root=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const parse=(f)=>{const r=ts.parseConfigFileTextToJson(f,fs.readFileSync(f,'utf8'));if(r.error)throw Error(ts.flattenDiagnosticMessageText(r.error.messageText,' '));return r.config};
const source=parse(path.join(root,'ORIGINALS/resource_pack/ui/file_upload_screen.json'));
const visibility=new Set(),bindings=new Set();
function walk(o,p='',out=[]){if(!o||typeof o!=='object')return out;for(const[k,v]of Object.entries(o)){const q=p+'/'+k;if(k==='binding_name'&&typeof v==='string'){bindings.add(v);if(v.endsWith('_visible'))visibility.add(v)}if(k.includes('@'))out.push({path:q,reference:k.split('@')[1]});walk(v,q,out)}return out}
const refs=walk(source);
const originalDir=path.join(root,'ORIGINALS/resource_pack/ui');
const defs=new Map();for(const f of fs.readdirSync(originalDir).filter(n=>n.endsWith('.json'))){const o=parse(path.join(originalDir,f));if(typeof o.namespace==='string')for(const[k,v]of Object.entries(o)){if(k==='namespace')continue;defs.set(o.namespace+'.'+k.split('@')[0],{file:f,key:k,value:v})}}
const directRefs=refs.map(r=>({...r,resolved:defs.has(r.reference.includes('.')?r.reference:'file_upload.'+r.reference)}));
const bankFile=path.resolve('src/progress-assets.ts');const sf=ts.createSourceFile(bankFile,fs.readFileSync(bankFile,'utf8'),ts.ScriptTarget.Latest,true);
let bank;function find(n){if(ts.isVariableDeclaration(n)&&n.name.getText(sf)==='progressAssets'){bank=n.initializer.arguments[0];while(ts.isAsExpression(bank)||ts.isSatisfiesExpression(bank)||ts.isParenthesizedExpression(bank))bank=bank.expression}ts.forEachChild(n,find)}find(sf);
function plain(n){if(ts.isStringLiteral(n))return n.text;if(ts.isNumericLiteral(n))return Number(n.text);if(ts.isArrayLiteralExpression(n))return n.elements.map(plain);if(ts.isObjectLiteralExpression(n))return Object.fromEntries(n.properties.map(p=>[p.name.text,plain(p.initializer)]));throw Error('nonliteral metadata')}
const entries=new Map(bank.properties.map(p=>[p.name.text,p.initializer]));
const pins=JSON.parse(fs.readFileSync(path.join(root,'MATERIAL-RAW-PINS.json'),'utf8'));
const materials=pins.map(row=>{const pngPin=row.files.find(f=>f.member.endsWith('.png'));if(pngPin.absent)return{texture:row.texture,sourceMissing:true,sourceFiles:row.files,reuse:{present:entries.has(row.texture)}};const raw=fs.readFileSync(path.join(root,pngPin.saved));const png=PNG.sync.read(raw);const alphas={transparent:0,partial:0,opaque:0};for(let i=3;i<png.data.length;i+=4)alphas[png.data[i]===0?'transparent':png.data[i]===255?'opaque':'partial']++;
const metaPin=row.files.find(f=>f.member.endsWith('.json'));const metadata=metaPin.absent?null:parse(path.join(root,metaPin.saved));
const own=entries.get(row.texture);let reuse={present:!!own};if(own){const props=new Map(own.properties.map(p=>[p.name.text,p.initializer]));const url=props.get('url');let ownRaw,from;if(ts.isStringLiteral(url)){ownRaw=Buffer.from(url.text.split(',')[1],'base64');from='literal data URI'}else if(ts.isPropertyAccessExpression(url)&&ts.isNewExpression(url.expression)&&url.expression.expression.getText(sf)==='URL'){const rel=url.expression.arguments[0].text;ownRaw=fs.readFileSync(path.resolve(path.dirname(bankFile),rel));from=rel}else throw Error('Unknown URL');const bm=props.has('metadata')?plain(props.get('metadata')):null;reuse={present:true,pngOrigin:from,pngSha256:hash(ownRaw),rawPngExact:ownRaw.equals(raw),widthExact:plain(props.get('width'))===png.width,heightExact:plain(props.get('height'))===png.height,metadata:bm,metadataSemanticExact:JSON.stringify(bm)===JSON.stringify(metadata)} }
return{texture:row.texture,width:png.width,height:png.height,alphaCounts:alphas,rgbaSha256:hash(png.data),metadata,sourceFiles:row.files,reuse}});
const selected=['common.common_panel','common.dialog_background_common','common.dialog_background_hollow_common','common.dialog_background_hollow_2','common.button','common_buttons.light_text_button','common_buttons.light_button_assets','common_buttons.new_ui_button_panel','common_buttons.new_ui_binding_button_label','common_buttons.button_image','common_buttons.locked_button_image','common_buttons.focus_border','common_art.title_panel_content','common_dialogs.full_screen_background','common_store.progress_loading_bars'];
const clauses=Object.fromEntries(selected.map(k=>[k,defs.get(k)||{missing:true}]));
fs.writeFileSync(path.join(root,'SOURCE-AUDIT.json'),JSON.stringify({sourceSha256:hash(fs.readFileSync(path.join(originalDir,'file_upload_screen.json'))),visibility:[...visibility].sort(),visibilityCombinations:2**visibility.size,bindings:[...bindings].sort(),directRefs,clauses},null,2)+'\n');
fs.writeFileSync(path.join(root,'MATERIAL-AUDIT.json'),JSON.stringify(materials,null,2)+'\n');
console.log(JSON.stringify({flags:[...visibility].sort(),directMissing:directRefs.filter(r=>!r.resolved),materials:materials.map(m=>({texture:m.texture,size:[m.width,m.height],metadata:m.metadata,alpha:m.alphaCounts,reuse:m.reuse}))},null,2));
