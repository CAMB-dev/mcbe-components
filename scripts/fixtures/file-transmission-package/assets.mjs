import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function verifyFileTransmissionMaterials({installed,root,ts,indexBytes,manifest,materials}){
const config={root,materials};
// Inspect actual published JS, not aliases to src or dynamic direct core imports.
const bundle=ts.createSourceFile('index.js',indexBytes.toString('utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),inline=new Map(),assetObjects=new Map(),residual=[];
const propertyName=n=>ts.isIdentifier(n)||ts.isStringLiteralLike(n)?n.text:undefined;
function literal(n){if(ts.isStringLiteralLike(n))return n.text;if(ts.isNumericLiteral(n))return Number(n.text);if(n.kind===ts.SyntaxKind.TrueKeyword)return true;if(n.kind===ts.SyntaxKind.FalseKeyword)return false;if(ts.isPrefixUnaryExpression(n)&&n.operator===ts.SyntaxKind.MinusToken)return-literal(n.operand);if(ts.isArrayLiteralExpression(n))return n.elements.map(literal);if(ts.isObjectLiteralExpression(n))return Object.fromEntries(n.properties.map(p=>{assert(ts.isPropertyAssignment(p));return[propertyName(p.name),literal(p.initializer)];}));throw Error('Expected literal source metadata');}
function decode(value){const m=/^data:([^,]*?),(.*)$/s.exec(value);assert(m,'Malformed published data URL');return m[1].endsWith(';base64')?Buffer.from(m[2],'base64'):Buffer.from(decodeURIComponent(m[2]));}
function assetURL(n){if(ts.isStringLiteralLike(n))return n.text;if(ts.isPropertyAccessExpression(n)&&n.name.text==='href'&&ts.isNewExpression(n.expression)){const first=n.expression.arguments?.[0];if(first&&ts.isStringLiteralLike(first))return first.text;}return null;}
function inspect(node){
 if(ts.isStringLiteralLike(node)&&node.text.startsWith('data:')){const bytes=decode(node.text);inline.set(hash(bytes),bytes);}
 if(ts.isNewExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='URL'){const first=node.arguments?.[0];if(first&&ts.isStringLiteralLike(first)&&first.text.includes('assets/')&&!first.text.startsWith('data:'))residual.push(first.text);}
 if(ts.isPropertyAssignment(node)&&ts.isObjectLiteralExpression(node.initializer)){const name=propertyName(node.name);if(name?.startsWith('textures/')){const fields=new Map(node.initializer.properties.filter(ts.isPropertyAssignment).map(p=>[propertyName(p.name),p.initializer]));if(fields.has('url')&&fields.has('width')&&fields.has('height')){const url=assetURL(fields.get('url'));if(url?.startsWith('data:')){const rows=assetObjects.get(name)??[];rows.push({sha256:hash(decode(url)),naturalSize:[literal(fields.get('width')),literal(fields.get('height'))],metadata:fields.has('metadata')?literal(fields.get('metadata')):null});assetObjects.set(name,rows);}}}}
 ts.forEachChild(node,inspect);
}
inspect(bundle);assert.deepEqual(residual,[],'Published JS retains relocatable asset URLs');
const golden=JSON.parse(await fs.readFile(config.materials,'utf8'));assert.equal(golden.materials.length,10);
async function walk(directory){const files=[];for(const item of await fs.readdir(directory,{withFileTypes:true})){assert(!item.isSymbolicLink());const name=path.join(directory,item.name);if(item.isDirectory())files.push(...await walk(name));else files.push(name);}return files;}
const assets=await walk(path.join(installed,'dist/assets')),rawMetadata=new Set();for(const file of assets)if(file.endsWith('.json'))rawMetadata.add(hash(await fs.readFile(file)));
let metadata=0;for(const material of golden.materials){assert(inline.has(material.pngSHA256),'Missing original inline PNG '+material.reference);const matches=assetObjects.get(material.reference)??[];assert(matches.some(row=>row.sha256===material.pngSHA256&&JSON.stringify(row.naturalSize)===JSON.stringify(material.naturalSize)&&JSON.stringify(row.metadata)===JSON.stringify(material.metadata?.value??null)),'Missing/altered compiled material metadata '+material.reference);if(material.metadata){metadata++;assert(rawMetadata.has(material.metadata.sha256),'Missing original raw metadata bytes '+material.reference);}}
assert.equal(hash(await fs.readFile(path.join(installed,'dist/assets/progress/LICENSE.md'))),golden.licenseSHA256,'Original material license bytes');
const publicCSS=['file-transmission.css'],css=new Map();
async function checkCSS(name){if(css.has(name))return;assert(!name.startsWith('..')&&!path.isAbsolute(name));const actual=await fs.readFile(path.join(installed,'dist',name)),source=await fs.readFile(path.join(config.root,'src',name));assert.deepEqual(actual,source,'Copied CSS bytes '+name);css.set(name,hash(actual));for(const match of actual.toString('utf8').matchAll(/@import\s+['"]([^'"]+[.]css)['"]/g))await checkCSS(path.normalize(path.join(path.dirname(name),match[1])));}
for(const name of publicCSS){assert.equal(manifest.exports['./'+name],'./dist/'+name,'Public CSS export '+name);await checkCSS(name);}
return{materials:golden.materials.length,metadata,materialLicenseSHA256:golden.licenseSHA256,publicCSS,cssDependencies:Object.fromEntries(css)};
}
