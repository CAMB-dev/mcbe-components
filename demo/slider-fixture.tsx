import{createRef,StrictMode,useLayoutEffect,useState}from'react';import type{CSSProperties}from'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{Slider}from'../src';import type{SliderProps}from'../src';import'../src/styles.css';
const ref=createRef<HTMLInputElement>(),api:any={events:[],ref},defaults={width:160,scale:2,value:50,min:0,max:100,step:1 as number|string,disabled:false,controlled:true,setter:false,present:true};
declare global{interface Window{sliderFixture:any;sliderInitial?:Partial<typeof defaults>}}
window.sliderFixture=api;
function Fixture(){const[s,set]=useState(()=>({...defaults,...window.sliderInitial})),[node,setNode]=useState<HTMLInputElement|null>(null);api.configure=(p:Partial<typeof defaults>)=>flushSync(()=>set(old=>({...old,...p})));api.settings=s;useLayoutEffect(()=>{api.node=s.setter?node:ref.current;});
const props:SliderProps={label:'Level',min:s.min,max:s.max,step:s.step,disabled:s.disabled,name:'level'};
return <form id="slider-form" style={{width:s.width,'--mc-range-scale':s.scale}as CSSProperties}>{s.present&&<Slider {...props} ref={s.setter?setNode:ref} {...(s.controlled?{value:s.value}:{defaultValue:s.value})} onValueChange={v=>api.events.push(v)} onChange={e=>api.lastInput=e.currentTarget.valueAsNumber}/>}</form>;}
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture/></StrictMode>);
