import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {NpcSkinPicker} from '../src/npc';
import {JigsawEditor,JigsawPriorityFields} from '../src/jigsaw';
import {CommandBlockEditor} from '../src/command-block';
// Intentionally only the documented unified entry. Per-component imports in
// the gallery must not hide dependency ordering bugs in this public path.
import '../src/styles.css';
import '../src/fonts.css';
declare global {interface Window {cssProfileFixture:{setScale:(scale:number)=>void;scale:number}}}
function Fixture(){
 const [scale,setScale]=useState(2);window.cssProfileFixture={setScale,scale};
 return <main style={{display:'grid',gap:24,padding:16}}>
  <section id="css-profile-npc"><NpcSkinPicker skins={Array.from({length:15},(_,i)=>({id:String(i),label:`Skin ${i}`}))} scale={scale} style={{width:301*scale}}/></section>
  <section id="css-profile-jigsaw"><JigsawEditor scale={scale}/></section>
  <section id="css-profile-priorities"><JigsawPriorityFields scale={scale}/></section>
  <section id="css-profile-command"><CommandBlockEditor scale={scale}/></section>
 </main>;
}
createRoot(document.getElementById('css-profile-root')!).render(<Fixture/>);
