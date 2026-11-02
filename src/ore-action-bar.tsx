import {forwardRef,useContext} from 'react';
import type {HTMLAttributes} from 'react';
import {OreButtonAppearanceContext,oreButtonAppearance} from './ore-button';

export interface OreActionBarProps extends Omit<HTMLAttributes<HTMLDivElement>,'dangerouslySetInnerHTML'> {
  readonly label?:string;
  readonly guiScale?:number;
  readonly locale?:string;
}
/** Source _de neutral row with corrected size2=.8rem spacing. It accepts any
 * children; horizontal OreButtons participate as flex1 0 0 source columns.
 * Placement, narrow-screen reparenting and save/join/delete remain host-owned. */
export const OreActionBar=forwardRef<HTMLDivElement,OreActionBarProps>(function OreActionBar({
  label,guiScale:givenScale,locale:givenLocale,className,style,children,...native
},ref){
  const parent=useContext(OreButtonAppearanceContext),guiScale=givenScale??parent?.guiScale??1,locale=givenLocale??parent?.locale;
  const units=oreButtonAppearance(guiScale,locale);
  if(label!==undefined&&typeof label!=='string')throw new TypeError('OreActionBar label must be text.');
  return <OreButtonAppearanceContext.Provider value={{guiScale,locale}}>
    <div {...native} ref={ref} className={['mc-ore-action-bar',className].filter(Boolean).join(' ')}
      role={native.role??(label?'group':undefined)} aria-label={native['aria-label']??(native['aria-labelledby']?undefined:label)}
      style={{...units,...style}} data-native-certified="false">{children}</div>
  </OreButtonAppearanceContext.Provider>;
});
