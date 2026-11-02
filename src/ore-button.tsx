import {createContext,forwardRef,useContext} from 'react';
import type {ButtonHTMLAttributes,CSSProperties,ReactNode} from 'react';

export type OreButtonVariant='primary'|'secondary'|'destructive';
export interface OreButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>,'dangerouslySetInnerHTML'> {
  readonly variant?:OreButtonVariant;
  readonly horizontal?:boolean;
  /** Host icon content only; icon-only buttons need a host aria-label. */
  readonly icon?:ReactNode;
  readonly guiScale?:number;
  readonly locale?:string;
}
interface Appearance {guiScale:number;locale?:string}
/** Internal composition context; not a public barrel export. */
export const OreButtonAppearanceContext=createContext<Appearance|null>(null);
/** Internal shared Web profile, not a native rem-provider reconstruction. */
export function oreButtonAppearance(guiScale:number,locale?:string):CSSProperties {
  if(!Number.isFinite(guiScale)||guiScale<=0||!Number.isFinite(guiScale*5)||guiScale*5>8192)
    throw new RangeError('Ore button guiScale must give a positive finite Web unit within8192 CSS pixels.');
  if(locale!==undefined&&typeof locale!=='string')throw new TypeError('Ore button locale must be a string.');
  const code=locale?.replaceAll('-','_').toLowerCase();
  const first=code==='zh_cn'?'Noto Sans SC':code==='zh_tw'?'Noto Sans TC':code?.startsWith('ja')?'Noto Sans JP':code?.startsWith('ko')?'Noto Sans KR':code?.startsWith('ar_')?'Noto Sans AR':'Noto Sans';
  return {'--mc-ore-unit':`${guiScale*5}px`,'--mc-ore-fallback':`"${first}","Noto Sans","Noto Sans SC","Noto Sans TC","Noto Sans JP","Noto Sans KR","Noto Sans AR",sans-serif`} as CSSProperties;
}

/** Finite Cg/yg elevated source profile. Real HTML button events and disabled
 * behavior remain native; :active is the explicit Web pressed-state mapping.
 * Focus uses a system outline because the source focus decorator is not closed.
 * No sound, controller routing, asset provider or native pixel claim is made. */
export const OreButton=forwardRef<HTMLButtonElement,OreButtonProps>(function OreButton({
  variant='secondary',horizontal=false,icon,guiScale:givenScale,locale:givenLocale,type='button',
  children,className,style,disabled,...native
},ref){
  const parent=useContext(OreButtonAppearanceContext),guiScale=givenScale??parent?.guiScale??1,locale=givenLocale??parent?.locale;
  const units=oreButtonAppearance(guiScale,locale);
  if(!['primary','secondary','destructive'].includes(variant))throw new TypeError('OreButton variant must be primary, secondary or destructive.');
  if(typeof horizontal!=='boolean'||disabled!==undefined&&typeof disabled!=='boolean')throw new TypeError('OreButton horizontal/disabled must be boolean.');
  if(type!=='button'&&type!=='submit'&&type!=='reset')throw new TypeError('OreButton type must be a native button type.');
  const hasChildren=children!==undefined&&children!==null;
  return <button {...native} ref={ref} type={type} disabled={disabled}
    className={['mc-ore-button',className].filter(Boolean).join(' ')} data-variant={variant} data-horizontal={horizontal||undefined}
    data-native-certified="false" data-focus-policy="web-system-outline" style={{...units,...style}}>
    <span className="mc-ore-button__face">
      <span className="mc-ore-button__specular" aria-hidden="true"/>
      <span className="mc-ore-button__content">
        {icon!==undefined&&icon!==null&&<span className="mc-ore-button__icon" data-with-label={hasChildren||undefined} aria-hidden="true">{icon}</span>}
        {hasChildren&&<span className="mc-ore-button__label">{children}</span>}
      </span>
    </span>
  </button>;
});
