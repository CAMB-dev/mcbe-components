import { useState } from 'react';
import { BlastFurnace, Button, CraftingTable, Furnace, Slider, Smoker } from '../src';
import type { InventoryItem } from '../src';
import { GameItemIcon } from './materials';

const coal: InventoryItem = { name: 'Coal', icon: <GameItemIcon name="coal"/>, count: 16 };
const rawBeef: InventoryItem = { name: 'Raw beef', icon: <GameItemIcon name="rawBeef"/>, count: 8 };
const steak: InventoryItem = { name: 'Steak', icon: <GameItemIcon name="steak"/>, count: 2 };
const ironSword: InventoryItem = { name: 'Iron sword', icon: <GameItemIcon name="ironSword"/> };
const ironNugget: InventoryItem = { name: 'Iron nugget', icon: <GameItemIcon name="ironNugget"/> };
const diamond: InventoryItem = { name: 'Diamond', icon: <GameItemIcon name="diamond"/> };
const stick: InventoryItem = { name: 'Stick', icon: <GameItemIcon name="stick"/> };
const sword: InventoryItem = { name: 'Diamond sword', icon: <GameItemIcon name="sword"/> };
const inventory = [coal, rawBeef, ironSword, diamond, stick];

export function ProcessingExamples({ notify }: { notify: (message: string) => void }) {
  const [progress, setProgress] = useState(50);
  const [fuel, setFuel] = useState(50);
  const [taken, setTaken] = useState<Record<string, boolean>>({});
  const take = (station: string, action: string) => {
    setTaken(previous => ({ ...previous, [station]: true }));
    notify(`${action}: ${station} result taken.`);
  };
  const common = { inventory, progress: progress / 100, fuelRemaining: fuel / 100, fuel: coal };
  return <>
    <div className="processing-controls">
      <Slider label="Smelting progress" min={0} max={100} step={1} value={progress} onValueChange={setProgress} formatValue={value=>`${value}%`}/>
      <Slider label="Fuel remaining" min={0} max={100} step={1} value={fuel} onValueChange={setFuel} formatValue={value=>`${value}%`}/>
      <Button size="sm" onClick={()=>{setTaken({});setProgress(50);setFuel(50);}}>Reset processing examples</Button>
    </div>
    <div className="workstation-examples" data-processing-examples>
      <div><h3>Crafting table</h3><CraftingTable inputs={[null,diamond,null,null,diamond,null,null,stick,null]}
        result={taken.crafting ? null : sword} inventory={inventory}
        onInputAction={(index,action)=>notify(`${action}: crafting slot ${index+1}`)}
        onTakeResult={action=>take('crafting',action)}/></div>
      <div><h3>Furnace</h3><Furnace {...common} input={rawBeef} result={taken.furnace ? null : steak}
        onInputAction={(slot,action)=>notify(`${action}: furnace ${slot}`)} onTakeResult={action=>take('furnace',action)}/></div>
      <div><h3>Blast furnace</h3><BlastFurnace {...common} input={ironSword} result={taken.blast ? null : ironNugget}
        onInputAction={(slot,action)=>notify(`${action}: blast furnace ${slot}`)} onTakeResult={action=>take('blast',action)}/></div>
      <div><h3>Smoker</h3><Smoker {...common} input={rawBeef} result={taken.smoker ? null : steak}
        onInputAction={(slot,action)=>notify(`${action}: smoker ${slot}`)} onTakeResult={action=>take('smoker',action)}/></div>
    </div>
    <p className="workstation-note">Original item textures. Move the controls to inspect full-size texture clipping. Your application supplies recipes, timing and inventory changes.</p>
  </>;
}
