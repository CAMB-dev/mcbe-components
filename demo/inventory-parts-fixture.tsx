import { useState } from 'react';
import { DurabilityBar, ItemCount, ItemImage, ResultSlot, SlotPlaceholder } from '../src/inventory';
import { gameItemTextures } from './materials';
import type { InventoryItem } from '../src/inventory';

export function InventoryPartsFixture() {
  const initial: InventoryItem={name:'Fixture result',image:gameItemTextures.sword.src,count:2,durability:.5};
  const [item,setItem]=useState<InventoryItem|null>(initial);
  const [primary,setPrimary]=useState(0), [secondary,setSecondary]=useState(0);
  const [click,setClick]=useState(0), [secondaryCallback,setSecondaryCallback]=useState(0);
  const [available,setAvailable]=useState(true);
  return <section id="inventory-parts-fixture" aria-label="Inventory part fixtures" style={{display:'grid',gap:8,justifyItems:'start',minWidth:0}}>
    <h2>Inventory part fixtures</h2>
    <div style={{position:'relative',width:36,height:36}} data-part="image"><ItemImage src={gameItemTextures.diamond.src} alt="Fixture diamond"/></div>
    <div style={{position:'relative',width:36,height:36}} data-part="placeholder"><SlotPlaceholder src={gameItemTextures.lapis.src} alt="Fixture lapis placeholder"/></div>
    <div style={{position:'relative',width:36,height:36}} data-part="count"><ItemCount count={64}/></div>
    <div style={{position:'relative',width:36,height:36}} data-part="durability"><DurabilityBar value={3} max={4} label="Fixture durability"/></div>
    <ResultSlot label="Primitive result" item={item} size="large" available={available}
      onClick={()=>setClick(value=>value+1)} onSecondaryAction={()=>setSecondaryCallback(value=>value+1)}
      onTake={action=>{if(action==='primary') {setPrimary(value=>value+1);setItem(null);} else setSecondary(value=>value+1);}}/>
    <button type="button" onClick={()=>{setItem(initial);setAvailable(true);}}>Reset primitive result</button>
    <button type="button" onClick={()=>setAvailable(value=>!value)}>Toggle primitive availability</button>
    <output aria-label="Primitive result events" style={{maxWidth:'100%',overflowWrap:'anywhere'}}>{JSON.stringify({primary,secondary,click,secondaryCallback})}</output>
  </section>;
}
