import{forwardRef,useRef,version as reactVersion}from'react';import type{ButtonHTMLAttributes,HTMLAttributes,Ref,MouseEvent}from'react';
import{ServerCustomContents,validateServerCustomContents}from'./server-forms';import type{ServerCustomField,ServerCustomFormValues,ServerCustomChangeDetail,ServerCustomContentsProps}from'./server-forms';
import{WorldSettingsActionButton}from'./world-settings-actions';import type{WorldSettingsActionDetail,WorldSettingsFont}from'./world-settings-actions';
import{deferClassicRequest,scheduleClassicTask,useClassicLayoutEffect,useClassicNodeRef}from'./classic-screen-lifecycle';
import{copyWorldSettingsData,worldSettingsBoolean,worldSettingsExtent,worldSettingsKeys}from'./world-settings-snapshot';
import{settingsFieldAvailable as available}from'./settings-fields-interaction';
type Field<F=ServerCustomField>=F extends ServerCustomField?Omit<F,'tooltip'|'formatValue'>&{readonly tooltip?:string}&(F extends{type:'slider'}?{readonly textValue:string}:{}):never;
/** Source factory's nine known control IDs. Caller format functions or rich
 * arbitrary children are not part of this materialized source collection. */
export type WorldServerSettingsField=Field;
export interface WorldServerSettingsSnapshot{
 readonly '#custom_form_length':number;readonly fields:readonly WorldServerSettingsField[];readonly value:ServerCustomFormValues;
 readonly '#submit_text':string;readonly '#submit_button_visible':boolean;
 /** Resolved generated_form100%c; text max height stays a host measurement. */
 readonly metrics:{readonly generatedHeight:number;readonly submitLabelMaxHeight:number};
}
export interface WorldServerSettingsChangeDetail{readonly collection:'custom_form';readonly index:number;readonly sourceControl:string;readonly control:HTMLElement;readonly value:ServerCustomFormValues;readonly change:ServerCustomChangeDetail}
export interface WorldServerSettingsSubmitDetail extends WorldSettingsActionDetail{readonly target:'button.submit_custom_form';readonly value:ServerCustomFormValues}
type Native=Omit<HTMLAttributes<HTMLDivElement>,'children'|'dangerouslySetInnerHTML'|'onChange'|'onSubmit'|'defaultValue'>;
export interface WorldServerSettingsProps extends Native{
 readonly children?:never;readonly dangerouslySetInnerHTML?:never;readonly width:number;readonly scale:number;readonly font:WorldSettingsFont;
 readonly snapshot:WorldServerSettingsSnapshot;readonly hiddenSlots:'reserve'|'collapse';readonly disabled?:boolean;readonly readOnly?:boolean;readonly inert?:boolean;
 readonly onValueRequest?:(detail:WorldServerSettingsChangeDetail)=>void;readonly onSubmitRequest?:(detail:WorldServerSettingsSubmitDetail)=>void;
 readonly generatedRef?:Ref<HTMLDivElement>;readonly submitRef?:Ref<HTMLButtonElement>;
 readonly inputProps?:ServerCustomContentsProps['inputProps'];readonly inputRefs?:ServerCustomContentsProps['inputRefs'];readonly dropdownRefs?:ServerCustomContentsProps['dropdownRefs'];readonly multiselectRefs?:ServerCustomContentsProps['multiselectRefs'];readonly optionRefs?:ServerCustomContentsProps['optionRefs'];readonly onExpandedChange?:ServerCustomContentsProps['onExpandedChange'];
 readonly submitButtonProps?:Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'dangerouslySetInnerHTML'|'disabled'|'hidden'|'type'>;
}
export function planWorldServerSettings(p:WorldServerSettingsProps){
 if(p.children!==undefined||p.dangerouslySetInnerHTML!==undefined)throw new TypeError('World server settings owns generated_form and its submit sibling.');
 worldSettingsExtent(p.width,'server width');if(!Number.isSafeInteger(p.scale)||p.scale<1||p.scale>32||p.width*p.scale>8192||p.width<=6)throw new RangeError('World server settings needs bounded source width and integer scale1..32.');
 if(!['reserve','collapse'].includes(p.hiddenSlots))throw new TypeError('World server settings requires explicit hidden-slot policy.');for(const v of[p.disabled??false,p.readOnly??false,p.inert??false])worldSettingsBoolean(v,'server capability');
 if(!p.font||typeof p.font.family!=='string'||!p.font.family.trim()||p.font.family.length>4096)throw new TypeError('World server settings requires a bounded host font.');worldSettingsExtent(p.font.size,'font size');worldSettingsExtent(p.font.lineHeight,'font line height');worldSettingsExtent(p.font.size*p.scale,'physical font size');worldSettingsExtent(p.font.lineHeight*p.scale,'physical font line height');
 const q=copyWorldSettingsData(p.snapshot);worldSettingsKeys(q,['#custom_form_length','fields','value','#submit_text','#submit_button_visible','metrics'],'server snapshot');worldSettingsKeys(q.metrics,['generatedHeight','submitLabelMaxHeight'],'server metrics');
 if(!Number.isSafeInteger(q['#custom_form_length'])||q['#custom_form_length']<0||q['#custom_form_length']>4096||!Array.isArray(q.fields)||q.fields.length!==q['#custom_form_length'])throw new TypeError('World server settings requires every custom_form factory record.');
 if(typeof q['#submit_text']!=='string')throw new TypeError('World server settings needs #submit_text.');worldSettingsBoolean(q['#submit_button_visible'],'#submit_button_visible');worldSettingsExtent(q.metrics.generatedHeight,'generated height',true);worldSettingsExtent(q.metrics.submitLabelMaxHeight,'submit max height');
 const editable=q.fields.filter(f=>!['label','header','divider'].includes(f.type));worldSettingsKeys(q.value,editable.map(f=>f.id),'complete server accepted values');
 for(const f of q.fields){if(f.tooltip!==undefined&&typeof f.tooltip!=='string')throw new TypeError('World server settings tooltip must be resolved source text.');if(f.type==='slider'&&typeof f.textValue!=='string')throw new TypeError('World server slider requires resolved display text.');}
 const fields:readonly ServerCustomField[]=q.fields.map(f=>f.type==='slider'?{...f,formatValue:()=>f.textValue}:f);validateServerCustomContents({fields,value:q.value,scale:p.scale});
 const height=q.metrics.generatedHeight+(q['#submit_button_visible']||p.hiddenSlots==='reserve'?32:0),width=p.width-4;if(height*p.scale>8192||p.width*height*p.scale*p.scale>16777216)throw new RangeError('World server settings source projection exceeds its finite budget.');return Object.freeze({snapshot:q,fields,width,height});
}
/** Actual server_form.custom_form_scrolling_content at W−4/offset2, not a
 * second full-screen form. No service execution or automatic submit. */
export const WorldServerSettings=forwardRef<HTMLDivElement,WorldServerSettingsProps>(function WorldServerSettings(p,ref){
 const plan=planWorldServerSettings(p),q=plan.snapshot,s=p.scale,{width,scale,font,snapshot,hiddenSlots,disabled=false,readOnly=false,inert,onValueRequest,onSubmitRequest,generatedRef,submitRef,inputProps,inputRefs,dropdownRefs,multiselectRefs,optionRefs,onExpandedChange,submitButtonProps,className,style,children,dangerouslySetInnerHTML,...native}=p;void width;void scale;void snapshot;void children;void dangerouslySetInnerHTML;
 const[node,attach]=useClassicNodeRef(ref),live=useRef({p,q}),click=useRef<MouseEvent<HTMLDivElement>|null>(null);useClassicLayoutEffect(()=>{live.current={p,q};});
 const valid=(captured:typeof live.current)=>live.current===captured&&!captured.p.disabled&&!captured.p.readOnly&&!captured.p.inert&&!captured.p.hidden&&available(node.current);
 const change=(value:ServerCustomFormValues,detail:ServerCustomChangeDetail)=>{const captured=live.current,field=captured.q.fields.find(f=>f.id===detail.id),event=detail.event??detail.sourceEvent,control=event?.currentTarget,activation=click.current;
  const owner=control??node.current,good=()=>valid(captured)&&!!owner&&!!node.current?.contains(owner)&&!activation?.defaultPrevented&&!activation?.nativeEvent.defaultPrevented;
  if(!good()||!field||field.visible===false||field.disabled||field.type!==detail.type||control?.closest('[hidden],[inert]'))return;
  const send=(change:ServerCustomChangeDetail=detail)=>{if(good())captured.p.onValueRequest?.(Object.freeze({collection:'custom_form',index:captured.q.fields.findIndex(f=>f.id===detail.id),sourceControl:`server_form.custom_${detail.type}`,control:owner!,value:copyWorldSettingsData(value),change}));};
  if(detail.event)deferClassicRequest(detail.event,detail.event.currentTarget,stable=>send({...detail,event:stable}),good);
  else if(detail.sourceEvent)deferClassicRequest(detail.sourceEvent,detail.sourceEvent.currentTarget,stable=>send({...detail,sourceEvent:stable}),good);
  else if(node.current)scheduleClassicTask(node.current,()=>send());
 };
 const inertProps={inert:inert?Number.parseInt(reactVersion,10)<19?'':true:undefined}as Record<string,string|boolean|undefined>;
 return<div {...native} {...inertProps} ref={attach} className={['mc-world-server-settings',className].filter(Boolean).join(' ')} data-source-control="server_form.custom_form_scrolling_content" data-source-collection="custom_form" data-source-collection-length={q['#custom_form_length']} data-native-certified="false" style={{...style,position:'relative',boxSizing:'border-box',width:p.width*s,height:plan.height*s,fontFamily:font.family,fontSize:font.size*s,lineHeight:`${font.lineHeight*s}px`}} onClickCapture={event=>{native.onClickCapture?.(event);event.persist();click.current=event;const saved=event;scheduleClassicTask(event.currentTarget,()=>{if(click.current===saved)click.current=null;});}}>
  <div className="mc-world-server-settings__stack" style={{position:'absolute',left:2*s,top:0,width:plan.width*s}}>
   <ServerCustomContents fields={plan.fields} value={q.value} scale={s} disabled={disabled||inert||p.hidden} readOnly={readOnly} ref={generatedRef} inputProps={inputProps} inputRefs={inputRefs} dropdownRefs={dropdownRefs} multiselectRefs={multiselectRefs} optionRefs={optionRefs} onValueChange={change} onExpandedChange={(id,expanded,event)=>{const captured=live.current;if(valid(captured))deferClassicRequest(event,event.currentTarget,stable=>{if(valid(captured))captured.p.onExpandedChange?.(id,expanded,stable);},()=>valid(captured));}} data-source-control="server_form.generated_contents" style={{height:q.metrics.generatedHeight*s,font:'inherit'}}/>
   <div hidden={!q['#submit_button_visible']&&hiddenSlots==='collapse'} style={{height:32*s,visibility:q['#submit_button_visible']?undefined:'hidden'}} aria-hidden={!q['#submit_button_visible']||undefined}>
    <WorldSettingsActionButton {...submitButtonProps} ref={submitRef} size={[plan.width,32]} scale={s} font={font} label={q['#submit_text']} target="button.submit_custom_form" tone="light" labelMaxHeight={q.metrics.submitLabelMaxHeight} disabled={disabled||readOnly||!q['#submit_button_visible']} inert={inert} data-source-control="server_form.custom_form_scrolling_content/submit_button" data-source-text-binding="#submit_text" data-source-text-binding-type="global" data-source-text-binding-condition="once" onAction={detail=>{const captured=live.current;if(valid(captured)&&node.current?.contains(detail.control)&&captured.q['#submit_button_visible'])onSubmitRequest?.(Object.freeze({...detail,target:'button.submit_custom_form',value:captured.q.value}));}}/>
   </div>
  </div>
 </div>;
});
