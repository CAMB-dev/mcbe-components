import {createContext,forwardRef,useContext,useId} from 'react';
import type {CSSProperties,HTMLAttributes,InputHTMLAttributes,ReactNode,Ref} from 'react';

/** Complete caller-owned6×7 Ore menus images. No installed artwork is bundled. */
export interface OreTextFieldSkins {readonly normal:string;readonly disabled:string}
type DataAttributes={[Name in `data-${string}`]?:string|number|boolean|undefined};
type ContainerProps=Omit<HTMLAttributes<HTMLDivElement>,'children'|'dangerouslySetInnerHTML'>&DataAttributes;
export interface OreTextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>,'type'|'value'|'defaultValue'|'children'|'dangerouslySetInnerHTML'> {
  readonly skins:OreTextFieldSkins;
  readonly type?:'text';
  readonly value?:string;
  readonly defaultValue?:string;
  /** Explicit Web unit profile, shared with existing Ore components:1rem=guiScale×5 CSS pixels. */
  readonly guiScale?:number;
  readonly locale?:string;
  /** Host validation only. No port parsing, source-service request or invented red skin. */
  readonly invalid?:boolean;
  readonly invalidMessage?:ReactNode;
  /** className/style and all other native attributes above belong to the input. */
  readonly wrapperProps?:ContainerProps;
  readonly wrapperRef?:Ref<HTMLDivElement>;
}
export interface OreFieldSectionProps {
  readonly label:ReactNode;
  readonly description?:ReactNode;
  readonly children:ReactNode;
  readonly guiScale?:number;
  readonly locale?:string;
  readonly sectionProps?:ContainerProps;
}
interface SectionContext {labelId:string;descriptionId?:string;guiScale:number;locale?:string}
const Section=createContext<SectionContext|null>(null);

function appearance(guiScale:number,locale?:string):CSSProperties {
  if(!Number.isFinite(guiScale)||guiScale<=0||!Number.isFinite(guiScale*5)||guiScale*5>8192)
    throw new RangeError('OreTextField guiScale must give a positive finite Web unit within8192 CSS pixels.');
  if(locale!==undefined&&typeof locale!=='string')throw new TypeError('OreTextField locale must be a string.');
  const code=locale?.replaceAll('-','_').toLowerCase();
  const first=code==='zh_cn'?'Noto Sans SC':code==='zh_tw'?'Noto Sans TC':code?.startsWith('ja')?'Noto Sans JP':code?.startsWith('ko')?'Noto Sans KR':code?.startsWith('ar_')?'Noto Sans AR':'Noto Sans';
  return {'--mc-ore-unit':`${guiScale*5}px`,'--mc-ore-fallback':`"${first}","Noto Sans","Noto Sans SC","Noto Sans TC","Noto Sans JP","Noto Sans KR","Noto Sans AR",sans-serif`} as CSSProperties;
}
function skinURL(value:unknown):string {
  if(typeof value!=='string'||!value.trim()||value.length>8192||/[\u0000-\u001f\u007f]/.test(value))
    throw new TypeError('OreTextField requires bounded caller-owned whole normal and disabled image URLs.');
  return `url(${JSON.stringify(value)})`;
}
function ids(...values:(string|undefined)[]):string|undefined {
  for(const value of values)if(value!==undefined&&typeof value!=='string')throw new TypeError('OreTextField ARIA ID references must be strings.');
  const tokens=[...new Set(values.flatMap(value=>value?.trim().split(/\s+/).filter(Boolean)??[]))];
  return tokens.length?tokens.join(' '):undefined;
}
function boolean(value:unknown,name:string) {
  if(value!==undefined&&typeof value!=='boolean')throw new TypeError(`OreTextField ${name} must be boolean.`);
}

/** Native text editing is kept intact. The decorative source skin never owns
 * events, caret, selection or IME. Focus-visible uses an explicit Web system
 * outline: the installed lm focus decorator is not recovered here. INVALID's
 * horizontal-shake symbol is known, but exact motion constants are not, so the
 * host message and aria-invalid are the only implemented validation feedback. */
export const OreTextField=forwardRef<HTMLInputElement,OreTextFieldProps>(function OreTextField({
  skins,type='text',value,defaultValue,guiScale:givenScale,locale:givenLocale,invalid=false,invalidMessage,
  wrapperProps={},wrapperRef,className,style,disabled,readOnly,...native
},ref){
  const section=useContext(Section),uid=useId(),guiScale=givenScale??section?.guiScale??1,locale=givenLocale??section?.locale;
  const units=appearance(guiScale,locale);
  if(type!=='text')throw new TypeError('OreTextField owns a native text input; type must be text.');
  if(!skins||typeof skins!=='object'||Array.isArray(skins))throw new TypeError('OreTextField skins are required.');
  const normal=skinURL(skins.normal),locked=skinURL(skins.disabled);
  if(value!==undefined&&typeof value!=='string'||defaultValue!==undefined&&typeof defaultValue!=='string')
    throw new TypeError('OreTextField value and defaultValue must remain literal strings.');
  boolean(invalid,'invalid');boolean(disabled,'disabled');boolean(readOnly,'readOnly');
  const feedback=invalid&&invalidMessage!==undefined&&invalidMessage!==null,feedbackId=feedback?`${uid}-feedback`:undefined;
  // An explicit individual aria-label owns the name unless the caller also
  // supplies labelledby IDs. Explicit labelledby IDs still merge the section.
  const sectionLabel=native['aria-label']===undefined||typeof native['aria-labelledby']==='string'&&!!native['aria-labelledby'].trim()?section?.labelId:undefined;
  const {className:wrapperClass,style:wrapperStyle,...wrapperNative}=wrapperProps;
  return <div {...wrapperNative} ref={wrapperRef} className={['mc-ore-text-field',wrapperClass].filter(Boolean).join(' ')}
    data-disabled={disabled||undefined} data-readonly={readOnly||undefined} data-invalid={invalid||undefined}
    data-native-certified="false" data-focus-policy="web-system-outline"
    style={{...units,'--mc-ore-text-field-normal':normal,'--mc-ore-text-field-disabled':locked,...wrapperStyle} as CSSProperties}>
    <div className="mc-ore-text-field__control">
      <span aria-hidden="true" className="mc-ore-text-field__skin"/>
      <input {...native} ref={ref} type="text" value={value} defaultValue={defaultValue} disabled={disabled} readOnly={readOnly}
        className={['mc-ore-text-field__input',className].filter(Boolean).join(' ')} style={style}
        aria-labelledby={ids(native['aria-labelledby'],sectionLabel)}
        aria-describedby={ids(native['aria-describedby'],section?.descriptionId,feedbackId)}
        aria-invalid={invalid?true:native['aria-invalid']}/>
    </div>
    {feedback&&<div id={feedbackId} className="mc-ore-text-field__feedback">{invalidMessage}</div>}
  </div>;
});

/** Source section spacing is natural-content layout, not a recovered fixed
 * outer height. Ud size3 maps to1.2rem and size1 to.4rem; these are token
 * mappings, not literal3/1rem. Default neutral paint follows Zf; outer panel
 * borders and engine theme overrides remain separate host concerns. */
export const OreFieldSection=forwardRef<HTMLDivElement,OreFieldSectionProps>(function OreFieldSection({
  label,description,children,guiScale:givenScale,locale:givenLocale,sectionProps={}
},ref){
  const parent=useContext(Section),uid=useId(),guiScale=givenScale??parent?.guiScale??1,locale=givenLocale??parent?.locale;
  const units=appearance(guiScale,locale),labelId=`${uid}-label`,descriptionId=description!==undefined&&description!==null?`${uid}-description`:undefined;
  const {className,style,...native}=sectionProps;
  return <Section.Provider value={{labelId,descriptionId,guiScale,locale}}>
    <div {...native} ref={ref} className={['mc-ore-field-section',className].filter(Boolean).join(' ')} style={{...units,...style}} data-native-certified="false">
      <div id={labelId} className="mc-ore-field-section__label">{label}</div>
      <div className="mc-ore-field-section__spacer" aria-hidden="true"/>
      {children}
      <div className="mc-ore-field-section__spacer" aria-hidden="true"/>
      {descriptionId&&<div id={descriptionId} className="mc-ore-field-section__description">{description}</div>}
    </div>
  </Section.Provider>;
});
