import { useState } from 'react';
import type { ReactNode } from 'react';
import { Beacon, BeaconEffect, Crafter, CrafterSlot, Loom, RecipeSelectionGrid, Stonecutter } from '../src/advanced-workstations';
import type { BeaconEffectId, RecipeSelectionOption } from '../src/advanced-workstations';

// Unmodified Mojang PNGs: recipe_book_item_bg / recipe_book_touch_cell_selected.
// Kept as original bytes so this consumer fixture has no production-skin oracle.
const recipeImage='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAxSURBVBhXY1y2dOl/BiTw9NkzBhYQ48nTp2ABENiwdgMDE5SNArAKsoDMAGlBAAYGAMQJDyeicQ3jAAAAAElFTkSuQmCC';
const selectedImage='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAgSURBVAhbY3j/8f9/GD518f9/BhgDhHPKt2MRgDFgGACZpzXq3IC09QAAAABJRU5ErkJggg==';
function Sample({id,children}:{id:string;children:ReactNode}){return <section className="calibration-case" style={{gridColumn:'1 / -1',minWidth:0}}><h2>{id}</h2><div className="calibration-stage" data-case={id}>{children}</div></section>;}
function options(selected:string,count=10):RecipeSelectionOption[]{return Array.from({length:count},(_,index)=>({id:`recipe-${index}`,label:`Recipe ${index}`,disabled:index===1,backgroundImage:selected===`recipe-${index}`?selectedImage:recipeImage,backgroundSlice:1}));}

export function AdvancedNativeFixtures(){
  const [events,setEvents]=useState<string[]>([]),[stone,setStone]=useState('recipe-0'),[pattern,setPattern]=useState('recipe-0'),[recipe,setRecipe]=useState('recipe-0');
  const [disabledSlots,setDisabledSlots]=useState<number[]>([0,4,8]),[powered,setPowered]=useState(false),[slotEnabled,setSlotEnabled]=useState(false),[effect,setEffect]=useState<BeaconEffectId>('speed');
  const record=(event:string)=>setEvents(previous=>[...previous,event]);
  return <section aria-label="Advanced workstation source specimens">
    <h2>Advanced workstation source specimens</h2>
    <Sample id="advanced-stonecutter"><Stonecutter recipes={options(stone)} selectedRecipeId={stone} onRecipeSelect={id=>{setStone(id);record(`stone:${id}`);}} onInputAction={action=>record(`stone-input:${action}`)} onTakeResult={action=>record(`stone-result:${action}`)}/></Sample>
    <Sample id="advanced-loom"><Loom patterns={options(pattern)} selectedPatternId={pattern} onPatternSelect={id=>{setPattern(id);record(`loom:${id}`);}} onInputAction={(index,action)=>record(`loom-input:${index}:${action}`)}/></Sample>
    <Sample id="advanced-stonecutter-native-empty"><Stonecutter/></Sample>
    <Sample id="advanced-loom-native-fit"><Loom patterns={options('recipe-0',31)}/></Sample>
    <Sample id="advanced-loom-overflow"><Loom patterns={options('recipe-0',84)}/></Sample>
    <Sample id="advanced-recipe"><RecipeSelectionGrid label="Source recipe specimen" options={options(recipe)} selectedId={recipe} onSelect={id=>{setRecipe(id);record(`recipe:${id}`);}}/></Sample>
    <Sample id="advanced-crafter"><Crafter items={[]} disabledSlots={disabledSlots} powered={powered} onSlotEnabledChange={(index,enabled)=>{setDisabledSlots(previous=>enabled?previous.filter(value=>value!==index):[...previous,index]);record(`crafter-enabled:${index}:${enabled}`);}} onSlotAction={(index,action)=>record(`crafter:${index}:${action}`)}/><button type="button" onClick={()=>setPowered(value=>!value)}>Toggle specimen crafter power</button></Sample>
    <Sample id="advanced-crafter-enabled"><CrafterSlot index={0} label="Enabled crafter specimen" onSlotAction={action=>record(`enabled-slot:${action}`)}/></Sample>
    <Sample id="advanced-crafter-disabled"><CrafterSlot index={0} id="advanced-disabled-slot" data-consumer="disabled-props" aria-description="Configurable slot" tabIndex={0}
      label="Disabled crafter specimen" enabled={slotEnabled} onFocus={()=>record('disabled-focus')} onEnabledChange={enabled=>{setSlotEnabled(enabled);record(`disabled-slot:${enabled}`);}}/></Sample>
    <Sample id="advanced-beacon"><Beacon payment={{name:'Diamond'}} effects={{speed:{enabled:true,selected:effect==='speed'},haste:{enabled:false},strength:{enabled:true,selected:effect==='strength'},extra:{enabled:true,visible:true}}} canConfirm={false} onEffectSelect={id=>{setEffect(id);record(`effect:${id}`);}} onConfirm={()=>record('confirm')} onCancel={()=>record('cancel')}/></Sample>
    <Sample id="advanced-beacon-native-empty"><Beacon/></Sample>
    <Sample id="advanced-beacon-confirm"><Beacon payment={{name:'Diamond'}} canConfirm onConfirm={()=>record('confirm')} onCancel={()=>record('cancel')}/></Sample>
    <Sample id="advanced-effect-default"><BeaconEffect effect="speed" aria-label="Default effect specimen" onClick={()=>record('effect-default')}/></Sample>
    <Sample id="advanced-effect-selected"><BeaconEffect effect="speed" selected aria-label="Selected effect specimen"/></Sample>
    <Sample id="advanced-effect-locked"><BeaconEffect effect="speed" disabled aria-label="Locked effect specimen" onClick={()=>record('effect-locked')}/></Sample>
    <output aria-label="Advanced fixture events">{events.join('|')}</output>
  </section>;
}
