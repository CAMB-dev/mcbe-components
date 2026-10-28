import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Checkbox, Select, Slider } from '../src';
import { BrewingStand } from '../src/brewing';
import type { BrewingSlot } from '../src/brewing';
import { CartographyTable, SmithingTable } from '../src/special-workstations';
import type { CartographyMode } from '../src/special-workstations';
import { AirBar, ArmorBar, Crosshair, ExperienceBar, HealthBar, Hotbar, HungerBar } from '../src/hud';
import type { InventoryItem } from '../src/inventory';
import { GameItemIcon } from './materials';
import type { GameItemName } from './materials';

const materialNames: Record<GameItemName, string> = {
  sword: 'Diamond sword', diamond: 'Diamond', apple: 'Apple', gem: 'Emerald', lapis: 'Lapis lazuli',
  coal: 'Coal', stick: 'Stick', rawBeef: 'Raw beef', steak: 'Steak', ironSword: 'Iron sword', ironNugget: 'Iron nugget',
  grass: 'Grass block', waterBottle: 'Water bottle', glassBottle: 'Glass bottle', blazePowder: 'Blaze powder',
  netherWart: 'Nether wart', netheriteUpgradeTemplate: 'Netherite upgrade', netheriteIngot: 'Netherite ingot',
  netheriteSword: 'Netherite sword', emptyMap: 'Empty map', filledMap: 'Map', paper: 'Paper',
};
function item(key: GameItemName, count = 1): InventoryItem {
  return { name: materialNames[key], icon: <GameItemIcon name={key}/>, count };
}
const inventory = (Object.keys(materialNames) as GameItemName[]).map(key => item(key));
const hotbar = ['sword', 'diamond', 'apple', 'coal', 'stick', 'waterBottle', 'netheriteSword', 'filledMap', 'paper'] as const;
const hotbarItems = hotbar.map(key => item(key, ['diamond', 'coal', 'paper'].includes(key) ? 16 : 1));
const mapModes: readonly { value: CartographyMode; label: string }[] = [
  { value: 'none', label: 'Empty' }, { value: 'clone', label: 'Clone' }, { value: 'rename', label: 'Rename' },
  { value: 'basic', label: 'Basic map' }, { value: 'locator', label: 'Locator map' },
  { value: 'extend', label: 'Extend' }, { value: 'locked', label: 'Locked' },
];

function ExampleSection({ id, title, detail, children }: { id: string; title: string; detail: string; children: ReactNode }) {
  return <section className="example" id={id} aria-labelledby={`${id}-title`}>
    <div className="example-heading"><div><h2 id={`${id}-title`}>{title}</h2><p>{detail}</p></div></div>
    <div className="example-frame">{children}</div>
  </section>;
}

export function NativeExamples({ notify }: { notify: (message: string) => void }) {
  const [progress, setProgress] = useState(50), [bubbles, setBubbles] = useState(50), [fuel, setFuel] = useState(50);
  const [brewingOpen, setBrewingOpen] = useState(true), [emptyBottles, setEmptyBottles] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<BrewingSlot>();
  const [invalidSmithing, setInvalidSmithing] = useState(false), [smithingTaken, setSmithingTaken] = useState(false);
  const [mapName, setMapName] = useState('Explorer map'), [mode, setMode] = useState<CartographyMode>('extend'), [mapTaken, setMapTaken] = useState(false);
  const [health, setHealth] = useState(17), [hunger, setHunger] = useState(15), [armor, setArmor] = useState(13), [air, setAir] = useState(7);
  const [experience, setExperience] = useState(50), [hotbarSelected, setHotbarSelected] = useState(0);
  return <>
    <ExampleSection id="brewing" title="Brewing stand" detail="Three bottle slots, brewing progress, bubbles and fuel from the original Classic layout.">
      <div className="processing-controls">
        <Slider label="Brewing progress" min={0} max={100} step={1} value={progress} onValueChange={setProgress} formatValue={value => `${value}%`}/>
        <Slider label="Brewing bubbles" min={0} max={100} step={1} value={bubbles} onValueChange={setBubbles} formatValue={value => `${value}%`}/>
        <Slider label="Brewing fuel remaining" min={0} max={100} step={1} value={fuel} onValueChange={setFuel} formatValue={value => `${value}%`}/>
        <Checkbox label="Empty bottle slots" checked={emptyBottles} onChange={event => setEmptyBottles(event.target.checked)}/>
        <Button size="sm" onClick={() => { setBrewingOpen(true); setEmptyBottles(false); setSelectedSlot(undefined); setProgress(50); setBubbles(50); setFuel(50); }}>Reset brewing example</Button>
      </div>
      <div className="workstation-examples">{brewingOpen ? <BrewingStand
        ingredient={item('netherWart', 8)} fuel={item('blazePowder', 16)}
        bottles={emptyBottles ? [] : [item('waterBottle'), item('waterBottle'), item('waterBottle')]}
        progress={progress / 100} bubbles={bubbles / 100} fuelRemaining={fuel / 100} selectedSlot={selectedSlot}
        inventory={inventory} hotbar={hotbarItems} onSelectionChange={setSelectedSlot}
        onSlotAction={(slot, action) => notify(`${action}: brewing ${typeof slot === 'number' ? `bottle ${slot + 1}` : slot}`)}
        onInventoryAction={(index, action) => notify(`${action}: brewing inventory ${index + 1}`)}
        onClose={() => { setBrewingOpen(false); notify('Closed brewing stand.'); }}/>
        : <Button onClick={() => setBrewingOpen(true)}>Open brewing stand</Button>}</div>
      <p className="workstation-note">Original item textures and GUI layers. The controls supply visible progress; your app supplies brewing rules, timers and inventory changes.</p>
    </ExampleSection>

    <ExampleSection id="special-workstations" title="Smithing & cartography" detail="Modern smithing inputs and the larger Classic map workstation.">
      <div className="processing-controls">
        <Checkbox label="Invalid smithing combination" checked={invalidSmithing} onChange={event => setInvalidSmithing(event.target.checked)}/>
        <Select label="Map operation" value={mode} options={mapModes} onChange={event => { setMode(mapModes.find(option => option.value === event.currentTarget.value)?.value ?? 'none'); setMapTaken(false); }}/>
        <Button size="sm" onClick={() => { setInvalidSmithing(false); setSmithingTaken(false); setMapTaken(false); setMapName('Explorer map'); setMode('extend'); }}>Reset special workstations</Button>
      </div>
      <div className="workstation-examples">
        <div><h3>Smithing table</h3><SmithingTable inputs={[item('netheriteUpgradeTemplate'), item('sword'), item('netheriteIngot')]}
          templateOverlay={false} baseOverlay={null} materialOverlay={null}
          result={invalidSmithing || smithingTaken ? null : item('netheriteSword')} invalid={invalidSmithing}
          inventory={inventory} hotbar={hotbarItems}
          onInputAction={(index, action) => notify(`${action}: smithing input ${index + 1}`)}
          onTakeResult={action => { setSmithingTaken(true); notify(`${action}: upgraded item taken.`); }}/></div>
        <div><h3>Cartography table</h3><CartographyTable name={mapName} onNameChange={setMapName} mode={mode}
          inputs={[item('filledMap'), mode === 'clone' ? item('emptyMap') : item('paper', 16)]}
          result={mapTaken || mode === 'none' ? null : { ...item('filledMap'), name: mapName || 'Map' }}
          inventory={inventory} hotbar={hotbarItems}
          onInputAction={(index, action) => notify(`${action}: cartography input ${index + 1}`)}
          onTakeResult={action => { setMapTaken(true); notify(`${action}: map taken.`); }}/></div>
      </div>
      <p className="workstation-note">Select a map operation or edit its name. Item results are supplied examples; equipment preview rendering and world map data belong to your app.</p>
    </ExampleSection>

    <ExampleSection id="hud" title="Survival HUD" detail="Health, hunger, armor, air, experience, hotbar and crosshair components.">
      <div className="processing-controls">
        <Slider label="Health points" min={0} max={20} step={1} value={health} onValueChange={setHealth}/>
        <Slider label="Hunger points" min={0} max={20} step={1} value={hunger} onValueChange={setHunger}/>
        <Slider label="Armor points" min={0} max={20} step={1} value={armor} onValueChange={setArmor}/>
        <Slider label="Air bubbles" min={0} max={10} step={1} value={air} onValueChange={setAir}/>
        <Slider label="Experience progress" min={0} max={100} step={1} value={experience} onValueChange={setExperience} formatValue={value => `${value}%`}/>
      </div>
      <div style={{ overflowX: 'auto', background: '#28292a', padding: 20 }}>
        <div style={{ display: 'grid', gap: 14, width: 364 }}>
          <div style={{ height: 70, display: 'grid', placeItems: 'center', isolation: 'isolate' }}><Crosshair/></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><ArmorBar value={armor}/><AirBar value={air}/></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><HealthBar value={health}/><HungerBar value={hunger}/></div>
          <div style={{ paddingTop: 18 }}><ExperienceBar progress={experience / 100} level={30}/></div>
          <Hotbar items={hotbarItems} selectedIndex={hotbarSelected} onSelectionChange={setHotbarSelected}
            onSlotAction={(index, action) => notify(`${action}: hotbar slot ${index + 1}`)}/>
        </div>
      </div>
      <p className="workstation-note">Original HUD glyphs and item textures. Stat row placement and effects reconstruct native custom renderers; complete in-game HUD matching remains unverified.</p>
    </ExampleSection>
  </>;
}
