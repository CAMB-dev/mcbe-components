import type {ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, Ref} from 'react';
import type {WorldSettingsFont} from './world-settings-actions';
import type {PermissionLevel, PermissionLevelLabels} from './player-permissions';

/** Resolved host metrics, in source logical units. No native font measurement is inferred. */
export interface SettingsFieldsTypography {
  readonly label:WorldSettingsFont;
  readonly description:WorldSettingsFont;
  readonly control:WorldSettingsFont;
}
export interface SettingsFieldIdentity {
  readonly id:string;
  readonly sourceControl:string;
  readonly binding?:string;
  readonly enabledBinding?:string;
  readonly collection?:{readonly name:string;readonly index:number;readonly id:string};
}
export interface SettingsFieldBase extends SettingsFieldIdentity {
  readonly ignored:boolean;
  readonly visible:boolean;
  readonly enabled:boolean;
  /** Explicit resolved source row budget; never computed from text length. */
  readonly height:number;
  /** Omission is the source's common 100% parent width. Horizontal stacks should resolve each child width. */
  readonly width?:number;
  readonly offset?:readonly[number,number];
  /** Explicit role overrides for source MinecraftTen/smooth/large instances; no implicit font multiplier. */
  readonly typography?:Partial<SettingsFieldsTypography>;
}
export interface SettingsOptionLayout {
  readonly mode:'one-line'|'two-line';
  readonly label:string;
  readonly showLabel:boolean;
  readonly labelHeight:number;
  readonly description:string|null;
  readonly descriptionHeight:number;
  readonly labelAlignment:'left'|'center';
  /** Host-resolved Y of the actual source control; generic trailing spacer is4. */
  readonly controlY:number;
}
interface OptionRow extends SettingsFieldBase {readonly option:SettingsOptionLayout}
export interface SettingsLabelRow extends SettingsFieldBase {
  readonly kind:'label';readonly text:string;
  readonly profile:'plain'|'group'|'header';readonly textHeight:number;
}
export interface SettingsInfoRow extends SettingsFieldBase {
  readonly kind:'info';readonly text:string;readonly textHeight:number;
  readonly textBinding:string;
  /** Omission renders only the original leaf. Presence retains its actual option_generic wrapper. */
  readonly option?:SettingsOptionLayout;
  readonly panelHeight?:number;
}
export interface SettingsSpacerRow extends SettingsFieldBase {readonly kind:'spacer'}
export interface SettingsDividerRow extends SettingsFieldBase {readonly kind:'divider';readonly inset:number}
export interface SettingsStackRow extends SettingsFieldBase {
  readonly kind:'stack';readonly orientation:'vertical'|'horizontal';readonly rows:readonly SettingsFieldRow[];
}
export interface SettingsToggleRow extends OptionRow {
  readonly kind:'toggle';readonly binding:string;readonly checked:boolean;readonly toggleName:string;
  readonly bindingCondition:'once'|'always_when_visible'|'visible';
}
export interface SettingsTextRow extends OptionRow {
  readonly kind:'text';readonly binding:string;readonly value:string;readonly placeholder:string;
  readonly textBoxName:string;readonly maxLength:number;
  /** Source declaration only. NumberChars is projected onto a native text input, never Number parsing. */
  readonly sourceTextType:'ExtendedASCII'|'NumberChars';
  readonly allowDataBinding:boolean;
}
export interface SettingsTextActionRow extends Omit<SettingsTextRow,'kind'> {
  readonly kind:'text-action';
  readonly action:{readonly presentation:'text'|'arrow'|'mock-arrow';readonly label:string;readonly target:string;readonly enabled:boolean;readonly labelMaxHeight:number};
  /** Explicit resolution of source85%/fill or overridden50%/fill. */
  readonly textFraction:number;
}
export interface SettingsChoice extends SettingsFieldIdentity {
  readonly binding:string;readonly label:string;readonly checked:boolean;
  readonly ignored:boolean;readonly visible:boolean;readonly enabled:boolean;
}
/** Actual world_section.player_waypoints_option_control; two independent source radio flags, not a dropdown. */
export interface SettingsRadioRow extends OptionRow {
  readonly kind:'radio';readonly profile:'waypoints';
  readonly choices:readonly[SettingsChoice,SettingsChoice];
  /** Host-resolved100%cm/100%sm paint and natural label budgets inside each authored17-high hitbox. */
  readonly visuals:readonly[{readonly height:number;readonly y:number;readonly labelHeight:number},{readonly height:number;readonly y:number;readonly labelHeight:number}];
  readonly descriptions:readonly[{readonly text:string;readonly height:number},{readonly text:string;readonly height:number}];
  /** Source declares shadow:true; its unresolved native offset/color is an explicit Web profile. */
  readonly labelShadow:{readonly offset:readonly[number,number];readonly color:string};
}
export interface SettingsDropdownRow extends OptionRow {
  readonly kind:'dropdown';readonly dropdownName:string;
  readonly faceLabel:string;readonly faceLabelBinding:string;
  readonly choices:readonly SettingsChoice[];
  readonly popup:{readonly scrolling:boolean;readonly height:number;readonly placement:'above'|'below';readonly label:string;readonly inputMode:'mouse'|'touch';readonly highlightOffset:readonly[number,number];readonly highlightExtraSize:readonly[number,number]};
}
export interface SettingsSliderWebDomain {
  readonly value:number;readonly min:number;readonly max:number;readonly step:number;
  readonly markers:readonly{readonly offset:number;readonly progress:boolean}[];
}
export interface SettingsSliderRow extends OptionRow {
  readonly kind:'slider';readonly binding:string;readonly sliderName:string;
  readonly sourceValue:number;readonly sourceSteps:number;readonly stepsBinding:string;
  readonly textValue:string;readonly textValueBinding:string;readonly web:SettingsSliderWebDomain;
}
export interface SettingsPermissionRow extends OptionRow {
  readonly kind:'permissions';readonly binding:string;readonly value:PermissionLevel|null;
  readonly labels:PermissionLevelLabels;readonly faceLabel:string;
  readonly faceIcon:{readonly src:string;readonly sourceSize:readonly[number,number]}|null;
  readonly choiceBindings:Readonly<Record<'visitor'|'member'|'operator',string>>;
  readonly popup:SettingsDropdownRow['popup'];
  readonly choiceHeights:Readonly<Record<'visitor'|'member'|'operator',number>>;
  readonly descriptionHeights:Readonly<Record<'visitor'|'member'|'operator',number>>;
}
export interface SettingsActionRow extends SettingsFieldBase {
  readonly kind:'action';readonly label:string;readonly target:string;
  readonly tone:'light'|'dark'|'realms';readonly labelMaxHeight:number;
}
export interface SettingsExperimentsRow extends SettingsFieldBase {
  readonly kind:'experiments';readonly collectionName:'experimental_toggles';
  readonly count:number;readonly countBinding:'#experimental_toggle_count';
  /** Complete source collection including ignored/hidden records, ordered by explicit index. */
  readonly rows:readonly SettingsToggleRow[];
}
export type SettingsFieldRow=SettingsLabelRow|SettingsInfoRow|SettingsSpacerRow|SettingsDividerRow|SettingsStackRow|SettingsToggleRow|SettingsTextRow|SettingsTextActionRow|SettingsDropdownRow|SettingsRadioRow|SettingsSliderRow|SettingsPermissionRow|SettingsActionRow|SettingsExperimentsRow;
export interface SettingsFieldsRequest {
  readonly kind:'change'|'action';readonly identity:SettingsFieldIdentity;
  /** Exact source binding or button target; never automatically prefixed. */
  readonly target:string;
  readonly previousValue?:string|boolean|number|null;
  readonly proposedValue?:string|boolean|number|null;
  readonly sourceValue?:number;readonly sourceSteps?:number;
  readonly mappingPolicy?:'explicit-web-domain';
  readonly control:HTMLInputElement|HTMLButtonElement;
  /** Original DOM event; control is the stable actual owner, independent of event.currentTarget clearing. */
  readonly nativeEvent:Event;
}
type DataAttributes={[key:`data-${string}`]:string|number|boolean|undefined};
export type SettingsFieldNativeInputProps=Omit<InputHTMLAttributes<HTMLInputElement>,'children'|'dangerouslySetInnerHTML'|'type'|'value'|'defaultValue'|'checked'|'defaultChecked'|'min'|'max'|'step'|'maxLength'|'disabled'|'readOnly'|'hidden'>&DataAttributes;
export type SettingsFieldNativeButtonProps=Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'dangerouslySetInnerHTML'|'type'|'value'|'defaultValue'|'disabled'|'hidden'>&DataAttributes;
export interface SettingsFieldsProps extends Omit<HTMLAttributes<HTMLDivElement>,'children'|'dangerouslySetInnerHTML'|'onChange'>,DataAttributes {
  readonly children?:never;readonly dangerouslySetInnerHTML?:never;
  readonly width:number;readonly scale:number;readonly typography:SettingsFieldsTypography;
  readonly rows:readonly SettingsFieldRow[];
  /** Explicit same-document content_area overlay. Omission/null uses an inline Web popup, never body. */
  readonly popupHost?:HTMLElement|null;
  readonly hiddenSlots:'reserve'|'collapse';readonly disabled?:boolean;readonly readOnly?:boolean;readonly inert?:boolean;
  readonly onRequest?:(request:SettingsFieldsRequest)=>void|false;
  readonly inputProps?:Readonly<Record<string,SettingsFieldNativeInputProps>>;
  readonly buttonProps?:Readonly<Record<string,SettingsFieldNativeButtonProps>>;
  readonly inputRefs?:Readonly<Record<string,Ref<HTMLInputElement>>>;
  /** Choice keys are `${row.id}:${choice.id}`; text-action keys are `${row.id}:action`. */
  readonly buttonRefs?:Readonly<Record<string,Ref<HTMLButtonElement>>>;
  readonly rowRefs?:Readonly<Record<string,Ref<HTMLDivElement>>>;
  readonly popupViewportRefs?:Readonly<Record<string,Ref<HTMLDivElement>>>;
}
