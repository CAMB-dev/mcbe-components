import {useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {OreFieldSection,OreTextField} from '../src/ore-text-field';
import {oreTextFieldSkins} from 'virtual:mcbeui-game-font';
import '../src/ore-text-field.css';

type Config={accept:boolean;disabled:boolean;readOnly:boolean;invalid:boolean;scale:number;description:string};
declare global{interface Window{oreFieldFixture:{configure:(v:Partial<Config>)=>void;input:HTMLInputElement|null;wrapper:HTMLDivElement|null;section:HTMLDivElement|null;changes:string[];submissions:string[];composition:string[];localSkins:boolean}}}
// A legal 1px test leaf is only an interaction-fixture host fallback. It is
// neither a product default nor part of source/native pixel qualification.
const fallback='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const skins=oreTextFieldSkins??{normal:fallback,disabled:fallback};
const api:Window['oreFieldFixture']={configure:()=>{},input:null,wrapper:null,section:null,changes:[],submissions:[],composition:[],localSkins:!!oreTextFieldSkins};
window.oreFieldFixture=api;
function Fixture(){
  const [config,setConfig]=useState<Config>({accept:true,disabled:false,readOnly:false,invalid:false,scale:2,description:'Source field description'});
  const [value,setValue]=useState('00123');
  const form=useRef<HTMLFormElement>(null);
  api.configure=patch=>setConfig(old=>({...old,...patch}));
  return <main style={{padding:12,maxWidth:700,boxSizing:'border-box',display:'grid',gap:12}}>
    <button id="outside">Outside</button>
    <span id="extra-label">Host label</span><span id="extra-description">Host description</span>
    <OreFieldSection label="Port" description={config.description} guiScale={config.scale} ref={node=>{api.section=node;}} sectionProps={{'data-testid':'section'}}>
      <OreTextField skins={skins} value={value} name="port" inputMode="numeric" id="controlled" ref={node=>{api.input=node;}}
        wrapperRef={node=>{api.wrapper=node;}} wrapperProps={{'data-testid':'controlled-wrapper'}}
        disabled={config.disabled} readOnly={config.readOnly} invalid={config.invalid} invalidMessage={config.invalid?'Host feedback':undefined}
        aria-labelledby="extra-label" aria-describedby="extra-description" className="native-owned" style={{textAlign:'right'}}
        onChange={event=>{api.changes.push(event.currentTarget.value);if(config.accept)setValue(event.currentTarget.value);}}
        onCompositionStart={()=>api.composition.push('start')} onCompositionEnd={()=>api.composition.push('end')}/>
    </OreFieldSection>
    <OreTextField skins={skins} aria-label="Empty" placeholder="Source placeholder" id="empty" guiScale={2}/>
    <form ref={form} onSubmit={event=>{event.preventDefault();api.submissions.push(String(new FormData(event.currentTarget).get('draft')));}}>
      <OreFieldSection label="Draft" guiScale={2}><OreTextField skins={skins} name="draft" defaultValue="Original" id="draft"/></OreFieldSection>
      <button type="submit">Submit</button><button type="reset">Reset</button>
    </form>
    <div style={{display:'grid',gap:12}}>{[2,4,6].flatMap(scale=>[false,true].map(disabled=><OreTextField key={`${scale}-${disabled}`} skins={skins} guiScale={scale}
      disabled={disabled} aria-label={`Material ${scale} ${disabled}`} wrapperProps={{'data-testid':`material-${scale}-${disabled}`,style:{width:260}}}/>))}</div>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
