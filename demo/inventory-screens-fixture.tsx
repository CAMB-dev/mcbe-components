import {useState} from 'react';
import type {ReactNode} from 'react';
import {ArmorSlot,CreativeInventory,InventoryToolbar,PlayerInventoryScreen,RecipeCategoryTabs,RecipeSearch} from '../src/inventory-screens';
const diamond=new URL('./assets/minecraft/diamond.png',import.meta.url).href;
const emerald=new URL('./assets/minecraft/emerald.png',import.meta.url).href;
const items=[{name:'Diamond',image:diamond,count:2},{name:'Emerald',image:emerald,count:6},{name:'Diamond sample',image:diamond}];
function Case({name,children}:{name:string;children:ReactNode}){return <section className="calibration-case" style={{gridColumn:'1 / -1',minWidth:0}}><h2>{name}</h2><div className="third-calibration-stage" role="region" aria-label={`${name} specimen scroll area`} tabIndex={0} style={{background:'#28292a',padding:24,minHeight:120,maxWidth:'100%',minWidth:0,overflowX:'auto'}} data-case={`third-${name}`}>{children}</div></section>;}
export function InventoryScreensFixture(){const[events,setEvents]=useState<string[]>([]),[query,setQuery]=useState(''),[filter,setFilter]=useState(false),[tab,setTab]=useState('construction'),[layout,setLayout]=useState<'creative'|'recipe-book'|'survival'>('creative');const record=(event:string)=>setEvents(previous=>[...previous,event]);return <section aria-label="Inventory source specimens">
<Case name="player-empty"><PlayerInventoryScreen title="Inventory specimen" onArmorAction={(kind,action)=>record(`armor:${kind}:${action}`)} onCraftingAction={(index,action)=>record(`craft:${index}:${action}`)} onTakeResult={action=>record(`take-empty:${action}`)} onClose={()=>record('player-close')}/></Case>
<Case name="player-items"><PlayerInventoryScreen title="Occupied inventory specimen" armor={[items[0]!,null,null,null]} offhand={items[1]} crafting={items} result={items[0]} inventory={items} hotbar={items} playerPreview={<span data-host-preview="true">Host player preview</span>} onTakeResult={action=>record(`take:${action}`)}/></Case>
{(['helmet','chestplate','leggings','boots','offhand']as const).map(kind=><Case key={kind} name={`armor-${kind}`}><ArmorSlot kind={kind} label={`Empty ${kind} specimen`}/></Case>)}
<Case name="recipe-search"><RecipeSearch label="Recipe search specimen" value={query} onValueChange={value=>{setQuery(value);record(`query:${value}`);}} craftableOnly={filter} onCraftableOnlyChange={value=>{setFilter(value);record(`filter:${value}`);}}/></Case>
<Case name="recipe-search-disabled"><RecipeSearch label="Disabled recipe search" defaultValue="diamond" disabled/></Case>
<Case name="recipe-search-readonly"><RecipeSearch label="Readonly recipe search" defaultValue="diamond" readOnly/></Case>
<Case name="recipe-tabs"><RecipeCategoryTabs value={tab} onValueChange={value=>{setTab(value);record(`category:${value}`);}}/></Case>
<Case name="recipe-tabs-disabled"><RecipeCategoryTabs categories={[{id:'first',label:'First category'},{id:'blocked',label:'Blocked category',disabled:true},{id:'third',label:'Third category'}]}/></Case>
<Case name="toolbar"><InventoryToolbar value={layout} modeLabels={{creative:'Creative mode','recipe-book':'Recipe book mode',survival:'Survival mode'}} onValueChange={value=>{setLayout(value);record(`layout:${value}`);}} onHelp={()=>record('toolbar-help')} onClose={()=>record('toolbar-close')}/></Case>
<Case name="toolbar-disabled"><InventoryToolbar disabled onValueChange={value=>record(`disabled-layout:${value}`)}/></Case>
<Case name="creative-pane"><CreativeInventory chrome="none" items={items}/></Case>
<Case name="creative"><CreativeInventory onHelp={()=>record('creative-help')} onLayoutChange={value=>record(`creative-layout:${value}`)} items={items} hotbar={items} onItemAction={(index,action)=>record(`creative:${index}:${action}`)} onHotbarAction={(index,action)=>record(`creative-hotbar:${index}:${action}`)} onClose={()=>record('creative-close')}/></Case>
<Case name="creative-native-empty"><CreativeInventory items={items} defaultCategoryId="search" defaultQuery="zz"/></Case>
<Case name="creative-native-overflow"><CreativeInventory items={Array.from({length:140},(_,index)=>({...items[index%items.length]!,name:`Source collection item ${index}`}))} defaultCategoryId="search"/></Case>
<Case name="creative-search"><CreativeInventory items={items} defaultCategoryId="search" defaultQuery="diamond" onItemAction={(index,action)=>record(`creative-search:${index}:${action}`)}/></Case>
<output aria-label="Inventory fixture events">{events.join('|')}</output></section>;}
