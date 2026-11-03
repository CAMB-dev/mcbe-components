import type{WorldGameSettingsSnapshot,WorldMultiplayerSettingsSnapshot}from'../src/world-settings-fields-model';
import type{SettingsFieldsRequest}from'../src/settings-fields-model';
import{worldSettingsDemoChoiceGroups,worldSettingsDemoSliders}from'./world-settings-model-data';
/** Demo-only acceptance policy; the library never changes another source flag. */
export function acceptWorldDemoRequest<T extends WorldGameSettingsSnapshot|WorldMultiplayerSettingsSnapshot>(family:'game'|'multiplayer',snapshot:T,request:SettingsFieldsRequest):T{
 if(request.proposedValue===undefined)return snapshot;
 const bindings={...snapshot.bindings}as Record<string,string|number|boolean>,next=request.proposedValue;
 if(Object.hasOwn(bindings,request.target)&&typeof bindings[request.target]===typeof next)bindings[request.target]=next as string|number|boolean;
 for(const group of worldSettingsDemoChoiceGroups[family]){
  const selected=group.choices.find(choice=>choice.binding===request.target);if(!selected)continue;
  for(const choice of group.choices)bindings[choice.binding]=choice===selected;
  if(group.faceBinding)bindings[group.faceBinding]=selected.label;
 }
 let metrics=snapshot.metrics;
 for(const slider of worldSettingsDemoSliders)if(slider.binding===request.target&&typeof next==='number'){
  const m=(metrics as WorldGameSettingsSnapshot['metrics'])[slider.key];metrics={...metrics,[slider.key]:{...m,web:{...m.web,value:next}}};bindings[slider.textBinding]=String(next);
 }
 if('experiments'in snapshot&&request.identity.collection?.name==='experimental_toggles')return{...snapshot,bindings,metrics,experiments:snapshot.experiments.map(row=>row.id===request.identity.collection!.id&&typeof next==='boolean'?{...row,'#experimental_toggle_value':next}:row)}as T;
 return{...snapshot,bindings,metrics}as T;
}
