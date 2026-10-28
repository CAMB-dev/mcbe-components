import { useState } from 'react';
import { Anvil, Button, Checkbox, RadioGroup } from '../src';
import type { AnvilCost } from '../src';
import { sampleInventory, sampleSword } from './sample-inventory';

export function AnvilExamples({ notify }: { notify: (message: string) => void }) {
  const [name,setName]=useState('Adventure blade');
  const [state,setState]=useState('normal'),[invalid,setInvalid]=useState(false),[taken,setTaken]=useState(false),[open,setOpen]=useState(true);
  const cost: AnvilCost | null = state==='none' ? null : state==='too-expensive' ? {kind:'too-expensive'} : {kind:'levels',levels:3,affordable:state!=='unaffordable'};
  return <>
    <div className="processing-controls">
      <RadioGroup label="Anvil cost state" value={state} onValueChange={setState} options={[
        {value:'normal',label:'Affordable'},{value:'unaffordable',label:'Insufficient levels'},
        {value:'too-expensive',label:'Too expensive'},{value:'none',label:'No cost'},
      ]}/>
      <Checkbox label="Invalid anvil combination" checked={invalid} onChange={event=>setInvalid(event.target.checked)}/>
      <Button size="sm" onClick={()=>{setName('Adventure blade');setState('normal');setInvalid(false);setTaken(false);setOpen(true);}}>Reset anvil example</Button>
    </div>
    <div className="workstation-examples">
      <div>{open && <Anvil name={name} onNameChange={setName} inputs={[sampleSword,null]} inventory={sampleInventory}
        result={taken || invalid ? null : {...sampleSword,name:name || 'Diamond sword'}} invalid={invalid}
        cost={taken || invalid ? null : cost} onClose={()=>setOpen(false)}
        onInputAction={(index,action)=>notify(`${action}: anvil input ${index+1}`)}
        onTakeResult={action=>{setTaken(true);notify(`${action}: anvil result taken.`);}}/>}</div>
    </div>
    <p className="workstation-note">Edit the item name and inspect the original cost states. Your application supplies the repair result, level requirement and inventory changes.</p>
  </>;
}
