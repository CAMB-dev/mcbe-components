import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import vm from'node:vm';import{transformSync}from'esbuild';
const source=fs.readFileSync(new URL('../src/settings-frame-model.ts',import.meta.url),'utf8');
const code=transformSync(source,{loader:'ts',format:'cjs',target:'es2022'}).code;
const context=vm.createContext({module:{exports:{}},exports:{}});context.exports=context.module.exports;
vm.runInContext(code,context,{timeout:1000});const layout=context.module.exports.layoutSettingsFrame;
const contract=JSON.parse(fs.readFileSync(new URL('../docs/settings-frame-geometry.json',import.meta.url),'utf8'));
const input=(patch={})=>({size:[640,360],scale:1,dialogRect:[0,2,640,356],backgroundHeight:360,variant:'navigation',inputMode:'mouse',mouseRailAllocation:'reserve',selectorScrollbarVisible:true,contentScrollbarVisible:true,contentHeaderHeight:0,contentFooterHeight:0,...patch});
const plain=value=>JSON.parse(JSON.stringify(value));
function expression(value,parent){if(typeof value==='number')return value;const match=/^(-?[0-9.]+)%(?: - ([0-9.]+)px)?$/.exec(value);assert(match,'source expression '+value);const ratio=Number(match[1])/100;return ratio*parent-Number(match[2]??0);}
function sourceBox(node,[x,y,w,h]){const width=expression(node.size[0],w),height=expression(node.size[1],h);return[x+(node.anchor==='top_right'?w-width:0)+expression(node.offset[0],w),y+expression(node.offset[1],h),width,height];}
for(const [w,h]of[[320,240],[501,313],[640,360]])test(`source literal geometry ${w}x${h} preserves fractional anchor positions`,()=>{
 const p=input({size:[w,h],dialogRect:[0,2,w,h-4],backgroundHeight:h}),g=layout(p),rect=p.dialogRect;
 assert.deepEqual(plain(g.selector.box),sourceBox(contract.selector,rect));assert.deepEqual(plain(g.content.box),sourceBox(contract.content,rect));assert.deepEqual(plain(g.divider),sourceBox(contract.divider,rect));
 const left=contract.dialogTitles.leftPadding,leftWidth=expression(contract.dialogTitles.dialogTitleWidth,w);
 assert.deepEqual(plain(g.dialogTitle),[left,2+contract.dialogTitles.offset[1],leftWidth,15]);
 assert.deepEqual(plain(g.sectionTitle),[left+leftWidth+contract.dialogTitles.centerPadding,5.5,w-left-leftWidth-contract.dialogTitles.centerPadding-contract.dialogTitles.rightPadding,15]);
 assert.equal(g.selector.railReservation,contract.mouseBar.slotWidth+contract.mouseBar.leftPadding+contract.mouseBar.rightPadding);
 assert.equal(g.selector.contentWidth,g.selector.box[2]-g.selector.railReservation-4);
});
test('explicit header/footer source intrinsics reduce only the middle fill viewport',()=>{
 const p=input({contentHeaderHeight:17.5,contentFooterHeight:24}),g=layout(p),whole=sourceBox(contract.content,p.dialogRect);
 assert.deepEqual(plain(g.contentArea),whole);
 assert.deepEqual(plain(g.contentHeader),[whole[0],whole[1],whole[2],17.5]);
 assert.deepEqual(plain(g.contentFooter),[whole[0],whole[1]+whole[3]-24,whole[2],24]);
 assert.deepEqual(plain(g.content.box),[whole[0],whole[1]+17.5,whole[2],whole[3]-41.5]);
 assert.deepEqual(plain(g.selector.box),sourceBox(contract.selector,p.dialogRect));
});
test('source fullscreen-content percentages are independent from browser fullscreen',()=>{
 const p=input({variant:'fullscreen-content'}),g=layout(p);assert.equal(g.selector,null);assert.equal(g.divider,null);
 assert.deepEqual(plain(g.content.box),sourceBox(contract.fullscreenContent,p.dialogRect));
});
test('explicit scrollbar snapshots keep mouse reservation and touch overlay separate',()=>{
 const withRails=layout(input()),hidden=layout(input({selectorScrollbarVisible:false,contentScrollbarVisible:false})),without=layout(input({mouseRailAllocation:'when-visible',selectorScrollbarVisible:false,contentScrollbarVisible:false})),touch=layout(input({inputMode:'touch'}));
 for(const name of['selector','content']){assert.equal(withRails[name].railReservation,8);assert.equal(hidden[name].railReservation,8);assert.equal(without[name].railReservation,0);assert.equal(touch[name].railReservation,0);assert.equal(without[name].contentWidth,withRails[name].contentWidth+8);}
});
test('snapshots and geometry are frozen and do not alias mutable input tuples',()=>{
 const p=input(),g=layout(p);p.size[0]=1;p.dialogRect[2]=1;
 assert.equal(g.layout.size[0],640);assert.equal(g.layout.dialogRect[2],640);
 for(const value of[g,g.layout,g.layout.size,g.layout.dialogRect,g.selector,g.selector.box,g.content.contentOffset])assert.equal(Object.isFrozen(value),true);
});
test('invalid geometry cannot silently turn into clipping or NaN CSS',()=>{
 for(const patch of[{scale:0},{scale:1.5},{size:[640,NaN]},{size:[8192,8192]},{dialogRect:[0,0,641,300]},{dialogRect:[-1,0,640,300]},{dialogRect:[0,0,80,300]},{dialogRect:[0,0,320,20]},{contentHeaderHeight:337},{contentFooterHeight:-1},{inputMode:'pen'},{variant:'invented'},{selectorScrollbarVisible:1},{backgroundHeight:Infinity}])assert.throws(()=>layout(input(patch)),/Settings frame/);
 const sparse=[0,0,640,356];delete sparse[2];assert.throws(()=>layout(input({dialogRect:sparse})),/Settings frame/);
});
test('integer GUI scale changes neither source percentages nor resolved logical boxes',()=>{
 const a=layout(input({scale:1})),b=layout(input({scale:2}));
 for(const key of['background','topBar','dialogTitle','sectionTitle','selector','content','divider'])assert.deepEqual(plain(a[key]),plain(b[key]));
});
