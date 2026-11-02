import {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PlayNavigationTabs, PlayScreenFrame} from '../src/play-screen-frame';
import {PlaySourceBackground} from '../src/play-screen-parts';
import {playScreenAssets} from '../src/play-screen-assets';
import '../src/styles.css';

interface PlayMaterialConfiguration {
  scale:1|2|3;
  background:'black'|'white';
  visible:boolean;
  /** Logical control dimensions; White remains the independent37×9 reference. */
  width:number;
  height:number;
}
interface PlayMaterialAPI {
  configure:(patch:Partial<PlayMaterialConfiguration>)=>void;
  ready:boolean;
  configuration:PlayMaterialConfiguration;
  selectors:Readonly<Record<string,string>>;
}
declare global {interface Window {playMaterial:PlayMaterialAPI}}

const initial:PlayMaterialConfiguration={scale:2,background:'black',visible:true,width:274,height:120};
const selectors={
  frame:'#play-material-frame',
  frameUnderfill:'#play-material-frame .mc-play-frame__underfill',
  frameUnderfillPatches:'#play-material-frame .mc-play-frame__underfill .mc-play-frame-skin__patch',
  navigation:'#play-material-navigation',
  worldsTab:'#play-material-navigation-tab-worlds',
  worldsSkin:'#play-material-navigation-tab-worlds .mc-play-navigation__tab-skin',
  control:'#play-material-control-host > .mc-play-source-background',
  white:'#play-material-white-host > .mc-play-source-background',
}as const;
const api:PlayMaterialAPI={configure:()=>{},ready:false,configuration:initial,selectors};
window.playMaterial=api;

function validate(p:PlayMaterialConfiguration):PlayMaterialConfiguration {
  if(![1,2,3].includes(p.scale)||!['black','white'].includes(p.background)||typeof p.visible!=='boolean')throw new TypeError('Invalid material fixture configuration.');
  if(![p.width,p.height].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n*p.scale<=8192)||p.width*p.height*p.scale*p.scale>16777216)throw new RangeError('Material fixture dimensions exceed the finite CSS pixel budget.');
  return p;
}
const navigation={value:'worlds' as const,labels:{worlds:'Worlds',friends:'Friends',servers:'Servers'},counts:{worlds:'1',friends:'2',servers:'3'},friends:{showBouncing:false,showNotBouncing:false,showInvites:false,inboxEnabled:false}};

function Fixture(){
  const [configuration,setConfiguration]=useState(initial);
  api.configuration=configuration;
  api.configure=patch=>setConfiguration(current=>validate({...current,...patch}));
  useEffect(()=>{api.ready=true;return()=>{api.ready=false;};},[]);
  const {scale,background,visible,width,height}=configuration;
  return <main id="play-material-fixtures" hidden={!visible} data-scale={scale} data-background={background} data-width={width} data-height={height}>
    <div id="play-material-frame-host" className="play-material-host" style={{background,width:360*scale,height:204*scale}}>
      <PlayScreenFrame id="play-material-frame" viewportSize={[360,204]} scale={scale} navigation={navigation} exitButtonVisible/>
    </div>
    <div id="play-material-navigation-host" className="play-material-host" style={{background,width:328*scale,height:30*scale}}>
      <PlayNavigationTabs {...navigation} id="play-material-navigation" idPrefix="play-material-navigation" width={328} scale={scale}/>
    </div>
    <div id="play-material-control-host" className="play-material-host" style={{background,width:width*scale,height:height*scale}}>
      <PlaySourceBackground asset={playScreenAssets['textures/ui/control']} scale={scale}/>
    </div>
    <div id="play-material-white-host" className="play-material-host" style={{background,width:37*scale,height:9*scale}}>
      <PlaySourceBackground asset={playScreenAssets['textures/ui/White']} scale={scale}/>
    </div>
  </main>;
}
createRoot(document.getElementById('play-material-root')!).render(<StrictMode><Fixture/></StrictMode>);
