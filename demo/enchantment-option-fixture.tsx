import { useRef, useState } from 'react';
import { EnchantmentOption, EnchantingTable } from '../src/workstations';

/** Isolated consumer fixture; the parent calibration page supplies library CSS. */
export function EnchantmentOptionFixture() {
  const [events,setEvents]=useState<string[]>([]), [submitted,setSubmitted]=useState(0);
  const button=useRef<HTMLButtonElement>(null);
  const record=(event:string)=>setEvents(previous=>[...previous,event]);
  return <section data-enchantment-fixture aria-label="Independent enchantment options">
    <h2>Independent enchantment option</h2>
    <div style={{width:216}}>
      <EnchantmentOption ref={button} id="standalone" buttonId="standalone-enchantment" label="Standalone enchantment" level={7} tier={2}
        runes={<span data-original-runes>Actual rune node</span>} data-consumer="preserved" className="consumer-option"
        aria-description="Custom requirement" onClick={()=>record('click')} onEnchant={id=>record(`enchant:${id}`)}/>
      <EnchantmentOption id="locked-standalone" label="Locked enchantment" level={30} tier={3} disabled
        onClick={()=>record('locked-click')} onEnchant={id=>record(`locked:${id}`)}/>
      <EnchantmentOption id="prevented" label="Prevented enchantment" level={3}
        onClick={event=>{record('prevented-click');event.preventDefault();}} onEnchant={id=>record(`unexpected:${id}`)}/>
      <form onSubmit={event=>{event.preventDefault();setSubmitted(count=>count+1);}}>
        <EnchantmentOption id="default-type" label="Default button type" level={1} onEnchant={id=>record(id)}/>
      </form>
    </div>
    <button type="button" onClick={()=>button.current?.focus()}>Focus standalone option</button>
    <output aria-label="Standalone option events">{events.join('|')}</output>
    <output aria-label="Standalone form submissions">{submitted}</output>
    <EnchantingTable title="Composed option table" options={[
      {id:'table-first',label:'First table enchantment',level:3,runes:<span data-table-runes>Table rune node</span>},
      {id:'table-second',label:'Second table enchantment',level:15},
      {id:'table-locked',label:'Locked table enchantment',level:30,disabled:true},
      {id:'table-hidden',label:'Fourth table enchantment',level:99},
    ]} onEnchant={id=>record(`table:${id}`)}/>
  </section>;
}
