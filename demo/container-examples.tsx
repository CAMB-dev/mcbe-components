import { useState } from 'react';
import { Button, Chest, Dispenser, Dropper, Hopper, ShulkerBox } from '../src';
import type { InventorySlotAction } from '../src';
import { sampleInventory } from './sample-inventory';

export function ContainerExamples({notify}:{notify:(message:string)=>void}) {
  const [closed,setClosed]=useState<Record<string,boolean>>({});
  const [selected,setSelected]=useState<Record<string,number>>({});
  const common=(name:string)=>({
    items:sampleInventory,inventory:sampleInventory,
    selectedIndex:selected[name] ?? -1,
    onSelectionChange:(index:number)=>setSelected(previous=>({...previous,[name]:index})),
    onSlotAction:(index:number,action:InventorySlotAction)=>notify(`${action}: ${name} slot ${index+1}`),
    onInventoryAction:(index:number,action:InventorySlotAction)=>notify(`${action}: ${name} inventory ${index+1}`),
    onClose:()=>{setClosed(previous=>({...previous,[name]:true}));notify(`Closed ${name}.`);},
  });
  return <>
    <div className="processing-controls"><Button size="sm" onClick={()=>{setClosed({});setSelected({});}}>Reset container examples</Button></div>
    <div className="workstation-examples" data-container-examples>
      <div><h3>Chest · 27 slots</h3>{!closed.chest && <Chest {...common('chest')}/>}</div>
      <div><h3>Large chest · 54 slots</h3>{!closed.large && <Chest {...common('large')} rows={6}/>}</div>
      <div><h3>Shulker box</h3>{!closed.shulker && <ShulkerBox {...common('shulker')}/>}</div>
      <div><h3>Hopper</h3>{!closed.hopper && <Hopper {...common('hopper')}/>}</div>
      <div><h3>Dispenser</h3>{!closed.dispenser && <Dispenser {...common('dispenser')}/>}</div>
      <div><h3>Dropper</h3>{!closed.dropper && <Dropper {...common('dropper')}/>}</div>
    </div>
    <p className="workstation-note">Original storage grids and bottom-anchored player inventory. Empty slots accept actions so your app can place held items. Item movement and redstone behavior are supplied by your app.</p>
  </>;
}
