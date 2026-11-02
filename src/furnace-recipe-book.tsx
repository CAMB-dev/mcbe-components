import {forwardRef,useId,useRef,useState} from 'react';
import type {CSSProperties,HTMLAttributes} from 'react';
import {RecipeBookEntry} from './recipe-book';
import type {RecipeBookEntryProps,RecipeBookItem,RecipeBookProps} from './recipe-book';
import type {InventoryItem} from './inventory';
import {RecipeFilterToggle} from './inventory-screens';
import type {RecipeFilterToggleProps} from './inventory-screens';
import {useRecipeBookView} from './recipe-book-core';
import {useClassicNodeRef} from './classic-screen-lifecycle';
import {furnaceScreenAssets} from './furnace-screen-assets';

export type FurnaceRecipeCategoryId='food'|'items'|'blocks'|'search';
export interface FurnaceRecipeCategoryBindings {
 readonly food:{readonly visible:boolean;readonly offset?:readonly[number,number]};
 readonly items:{readonly leftmostVisible:boolean;readonly normalVisible:boolean;readonly offset?:readonly[number,number]};
 readonly blocks:{readonly leftmostVisible:boolean;readonly normalVisible:boolean;readonly offset?:readonly[number,number]};
}
export interface FurnaceRecipeBookItem extends Omit<RecipeBookItem,'craftableCount'|'modifier'|'item'> {
 readonly item?:Omit<InventoryItem,'count'|'durability'>;
}
export interface FurnaceRecipeBookEntryProps extends Omit<RecipeBookEntryProps,'entry'> {readonly entry:FurnaceRecipeBookItem}
export interface FurnaceRecipeFilterToggleProps extends Omit<RecipeFilterToggleProps,'craftableOnly'|'defaultCraftableOnly'|'onCraftableOnlyChange'> {
 readonly filteringEnabled?:boolean;
 readonly defaultFilteringEnabled?:boolean;
 readonly onFilteringEnabledChange?:(enabled:boolean)=>void;
}
type DataAttributes={[key:`data-${string}`]:string|number|boolean|undefined};
export interface FurnaceRecipeCategoryTabsProps extends Omit<HTMLAttributes<HTMLDivElement>,'children'|'defaultValue'|'onChange'>,DataAttributes {
 readonly bindings:FurnaceRecipeCategoryBindings;
 readonly labels:Readonly<Record<FurnaceRecipeCategoryId,string>>;
 readonly value:FurnaceRecipeCategoryId;
 readonly onValueChange?:(value:FurnaceRecipeCategoryId)=>void;
 readonly label?:string;
 readonly disabled?:boolean;
 readonly panelId?:string;
}
export interface FurnaceRecipeBookProps extends Omit<RecipeBookProps,'categories'|'creative'|'entries'|'categoryId'|'onCategoryChange'|'craftableOnly'|'onCraftableOnlyChange'>,DataAttributes {
 readonly entries:readonly FurnaceRecipeBookItem[];
 readonly categoryId:FurnaceRecipeCategoryId;
 readonly onCategoryChange?:(value:FurnaceRecipeCategoryId)=>void;
 readonly categoryBindings:FurnaceRecipeCategoryBindings;
 readonly categoryLabels:Readonly<Record<FurnaceRecipeCategoryId,string>>;
 readonly filteringEnabled:boolean;
 readonly onFilteringEnabledChange?:(enabled:boolean)=>void;
 /** Independent #is_left_tab_inventory binding; never inferred from categoryId. */
 readonly inventoryTab:boolean;
}

const categories=['food','items','blocks','search'] as const;
const cx=(...values:(string|undefined)[])=>values.filter(Boolean).join(' ');
const url=(value:string)=>`url(${JSON.stringify(value)})`;
const filterSkins={
 '--mc-inv-screen-filter-off':url(furnaceScreenAssets.furnace_toggle_off.url),
 '--mc-inv-screen-filter-on':url(furnaceScreenAssets.furnace_toggle_on.url),
 '--mc-inv-screen-filter-off-hover':url(furnaceScreenAssets.furnace_toggle_off_hover.url),
 '--mc-inv-screen-filter-on-hover':url(furnaceScreenAssets.furnace_toggle_on_hover.url),
} as CSSProperties;
function category(value:unknown):asserts value is FurnaceRecipeCategoryId {if(!categories.includes(value as FurnaceRecipeCategoryId))throw new TypeError('Furnace recipe category must be food, items, blocks or search.');}
function boolean(value:unknown,name:string){if(typeof value!=='boolean')throw new TypeError(`Furnace recipe ${name} must be boolean.`);}
function label(value:unknown,name:string){if(typeof value!=='string'||!value.trim())throw new TypeError(`Furnace recipe ${name} must be nonempty text.`);}
function offset(value:readonly[number,number]|undefined):readonly[number,number]{if(value===undefined)return[0,0];if(!Array.isArray(value)||value.length!==2||![value[0],value[1]].every(n=>typeof n==='number'&&Number.isFinite(n)&&Number.isFinite(n*2)))throw new TypeError('Furnace category offset must contain two finite game-pixel numbers.');return value;}
function validate(bindings:FurnaceRecipeCategoryBindings,labels:Readonly<Record<FurnaceRecipeCategoryId,string>>){
 if(!bindings||typeof bindings!=='object')throw new TypeError('Furnace category bindings are required.');
 for(const id of categories)label(labels?.[id],`${id} label`);
 if(!bindings.food||!bindings.items||!bindings.blocks)throw new TypeError('Furnace category bindings require food, items and blocks.');
 boolean(bindings.food.visible,'food.visible');offset(bindings.food.offset);
 for(const id of['items','blocks'] as const){boolean(bindings[id].leftmostVisible,`${id}.leftmostVisible`);boolean(bindings[id].normalVisible,`${id}.normalVisible`);offset(bindings[id].offset);}
}
function sourceEntry(entry:FurnaceRecipeBookItem):RecipeBookItem {
 // The furnace source replaces the item subtree: omitted count/group controls
 // cannot be restored by a wider structural JS object from a crafting caller.
 return {...entry,craftableCount:undefined,modifier:'none',item:entry.item?{...entry.item,count:undefined,durability:undefined}:undefined};
}

/** Furnace item-cell source profile: background/renderer/selection only.
 * A red background remains actionable unless the host explicitly disables it. */
export const FurnaceRecipeBookEntry=forwardRef<HTMLButtonElement,FurnaceRecipeBookEntryProps>(function FurnaceRecipeBookEntry({entry,className,...native},ref){
 const [,attach]=useClassicNodeRef(ref);
 return <RecipeBookEntry {...native} ref={attach} entry={sourceEntry(entry)} className={cx('mc-furnace-recipe-book-entry',className)}/>;
});

/** Original four whole furnace PNGs; the inherited control is29x17 game pixels. */
export const FurnaceRecipeFilterToggle=forwardRef<HTMLButtonElement,FurnaceRecipeFilterToggleProps>(function FurnaceRecipeFilterToggle({filteringEnabled,defaultFilteringEnabled=false,onFilteringEnabledChange,label:givenLabel='Smeltable recipes only',className,style,...native},ref){
 if(filteringEnabled!==undefined)boolean(filteringEnabled,'filteringEnabled');boolean(defaultFilteringEnabled,'defaultFilteringEnabled');label(givenLabel,'filter label');
 const [,attach]=useClassicNodeRef(ref);
 return <RecipeFilterToggle {...native} ref={attach} craftableOnly={filteringEnabled} defaultCraftableOnly={defaultFilteringEnabled} onCraftableOnlyChange={onFilteringEnabledChange} label={givenLabel}
  className={cx('mc-furnace-recipe-filter',className)} style={{...filterSkins,...style}}/>;
});

interface Control {category:FurnaceRecipeCategoryId;variant:'leftmost'|'normal'|'rightmost';key:string;offset:readonly[number,number]}
/** Fixed source holders. Visibility never packs the array or changes edges.
 * Roving DOM focus and tab ARIA are Web policies, not engine controller closure. */
export const FurnaceRecipeCategoryTabs=forwardRef<HTMLDivElement,FurnaceRecipeCategoryTabsProps>(function FurnaceRecipeCategoryTabs({bindings,labels,value,onValueChange,label:givenLabel='Recipe categories',disabled=false,panelId,id:givenId,className,onKeyDown,...native},ref){
 validate(bindings,labels);category(value);boolean(disabled,'disabled');label(givenLabel,'categories label');
 const generated=useId(),id=givenId??`mc-furnace-categories-${generated}`,buttons=useRef(new Map<string,HTMLButtonElement>()),[focused,setFocused]=useState<string>(),[,attach]=useClassicNodeRef(ref);
 const controls:Control[]=[];
 if(bindings.food.visible)controls.push({category:'food',variant:'leftmost',key:'food-leftmost',offset:offset(bindings.food.offset)});
 for(const name of['items','blocks'] as const)for(const variant of['leftmost','normal'] as const)if(bindings[name][variant==='leftmost'?'leftmostVisible':'normalVisible'])controls.push({category:name,variant,key:`${name}-${variant}`,offset:offset(bindings[name].offset)});
 controls.push({category:'search',variant:'rightmost',key:'search-rightmost',offset:[0,0]});
 const active=!disabled?(controls.some(control=>control.key===focused)?focused:controls.find(control=>control.category===value)?.key??controls[0]?.key):undefined;
 const choose=(control:Control)=>{if(!disabled)onValueChange?.(control.category);};
 return <div {...native} ref={attach} id={id} className={cx('mc-recipe-categories','mc-furnace-recipe-categories',className)} role="tablist" aria-label={native['aria-labelledby']?undefined:native['aria-label']??givenLabel} aria-orientation="horizontal"
  aria-multiselectable={controls.filter(control=>control.category===value).length>1||undefined} data-focus-policy="web-roving" onKeyDown={event=>{
   onKeyDown?.(event);if(event.defaultPrevented||event.nativeEvent.isComposing||event.keyCode===229||event.altKey||event.ctrlKey||event.metaKey||disabled)return;
   const current=controls.findIndex(control=>buttons.current.get(control.key)===event.target);if(current<0)return;
   const rtl=event.currentTarget.ownerDocument.defaultView?.getComputedStyle(event.currentTarget).direction==='rtl',previous=rtl?'ArrowRight':'ArrowLeft',next=rtl?'ArrowLeft':'ArrowRight';
   if(![previous,next,'Home','End'].includes(event.key))return;event.preventDefault();
   const target=event.key==='Home'?controls[0]:event.key==='End'?controls.at(-1):controls[(current+(event.key===next?1:-1)+controls.length)%controls.length];
   if(target){setFocused(target.key);choose(target);buttons.current.get(target.key)?.focus();}
  }}>
  {categories.map(name=><span key={name} id={`${id}-${name}`} className="mc-furnace-recipe-categories__accessible-label">{labels[name]}</span>)}
  {categories.map(name=><div key={name} className="mc-furnace-recipe-categories__holder" data-holder={name}>{controls.filter(control=>control.category===name).map(control=><button key={control.key} ref={node=>{if(node)buttons.current.set(control.key,node);else buttons.current.delete(control.key);}} type="button" role="tab" id={`${id}-${control.key}`}
   className="mc-recipe-categories__tab" data-category={name} data-variant={control.variant} data-edge={control.variant==='normal'?undefined:control.variant==='leftmost'?'left':'right'}
   style={{left:control.offset[0]*2,top:control.offset[1]*2}} aria-label={labels[name]} aria-selected={value===name} aria-controls={panelId} disabled={disabled} tabIndex={control.key===active?0:-1}
   onFocus={()=>setFocused(control.key)} onClick={event=>{if(!event.defaultPrevented)choose(control);}}>
   <span className={cx('mc-recipe-categories__icon',name==='search'?'mc-recipe-categories__icon--search':undefined)} aria-hidden="true" style={name==='search'?undefined:{'--category-icon':url(furnaceScreenAssets[`category_icon_${name}`].url)} as CSSProperties}/>
  </button>)}</div>)}
  <span className="mc-furnace-recipe-categories__fill" aria-hidden="true"/>
 </div>;
});

/** Classic furnace left pane,146x166 game pixels at the existing GUI2 profile.
 * Recipe lookup, all raw bindings, filtering, mutation and native drag/drop
 * services remain host-owned. Inventory and search flags stay independent. */
export const FurnaceRecipeBook=forwardRef<HTMLDivElement,FurnaceRecipeBookProps>(function FurnaceRecipeBook({entries,categoryId,onCategoryChange,categoryBindings,categoryLabels,filteringEnabled,onFilteringEnabledChange,inventoryTab,className,style,filterLabel='Smeltable recipes only',...native},ref){
 validate(categoryBindings,categoryLabels);category(categoryId);boolean(filteringEnabled,'filteringEnabled');boolean(inventoryTab,'inventoryTab');
 const [,attach]=useClassicNodeRef(ref);
 return useRecipeBookView({...native,entries:entries.map(sourceEntry),categoryId,onCategoryChange:id=>{category(id);onCategoryChange?.(id);},craftableOnly:filteringEnabled,onCraftableOnlyChange:onFilteringEnabledChange,filterLabel,
  className:cx('mc-furnace-recipe-book',className),style:{...filterSkins,...style},'data-inventory-tab':inventoryTab||undefined,'data-source-nodrop-zone':inventoryTab?'146x166-layer2':undefined} as RecipeBookProps,attach,{
   profile:'furnace',sourceContext:false,renderEntry:props=><FurnaceRecipeBookEntry {...props}/>,
   renderCategories:props=><FurnaceRecipeCategoryTabs {...props} bindings={categoryBindings} labels={categoryLabels} value={categoryId}/>,
   renderFilter:({craftableOnly,onCraftableOnlyChange,...props})=><FurnaceRecipeFilterToggle {...props} filteringEnabled={craftableOnly} onFilteringEnabledChange={onCraftableOnlyChange}/>,
  });
});
