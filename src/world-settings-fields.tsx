import {forwardRef} from 'react';
import {SettingsFields} from './settings-fields';
import {planWorldSettingsFields} from './world-settings-fields-model';
import type {WorldGameSettingsProps,WorldMultiplayerSettingsProps} from './world-settings-fields-model';
export type {WorldGameSettingsProps,WorldMultiplayerSettingsProps,WorldGameSettingsSnapshot,WorldMultiplayerSettingsSnapshot,WorldSettingsNamedSnapshot,WorldSettingsFieldMetrics,WorldSettingsExperimentSnapshot} from './world-settings-fields-model';
/** Fixed Game69 and authored nested source topology; complete named runtime snapshots only. */
export const WorldGameSettings=forwardRef<HTMLDivElement,WorldGameSettingsProps>(function WorldGameSettings({snapshot,inputMode,...props},ref){
 if(props.rows!==undefined||props.children!==undefined||props.dangerouslySetInnerHTML!==undefined)throw new TypeError('World Settings named pages reject rows, children and injected HTML.');
 const plan=planWorldSettingsFields('game',{...props,snapshot,inputMode,rows:[]});return <SettingsFields {...props} ref={ref} rows={plan.rows} data-world-settings-source="game"/>;
});
/** Fixed Multiplayer8; pure warning labels, account-help intent and source dropdown choices. */
export const WorldMultiplayerSettings=forwardRef<HTMLDivElement,WorldMultiplayerSettingsProps>(function WorldMultiplayerSettings({snapshot,inputMode,...props},ref){
 if(props.rows!==undefined||props.children!==undefined||props.dangerouslySetInnerHTML!==undefined)throw new TypeError('World Settings named pages reject rows, children and injected HTML.');
 const plan=planWorldSettingsFields('multiplayer',{...props,snapshot,inputMode,rows:[]});return <SettingsFields {...props} ref={ref} rows={plan.rows} data-world-settings-source="multiplayer"/>;
});
