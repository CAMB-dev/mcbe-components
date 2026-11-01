import { forwardRef } from 'react';
import type { CSSProperties } from 'react';
import { useClassicNodeRef } from './classic-screen-lifecycle';
import { ClassicSkin } from './classic-skin';
import { Image } from './image';
import { mobEffectAssets, mobEffectIconBackgrounds } from './mob-effect-assets';
import { resolveMobEffectRowLayout, validateMobEffectRef } from './mob-effect-layout';
import type { MobEffectRowProps, MobEffectTextContext } from './mob-effect-types';

/** Source fixed240x30 collection row. Ambient changes its original background
 * only. Name/timer are literal display bindings, with no timer/sort/provider. */
export const MobEffectRow=forwardRef<HTMLDivElement,MobEffectRowProps>(function MobEffectRow({
  effect,scale,textProfile,iconLayout,renderText,className='',style,...native
},forwardedRef){
  if(native.children!==undefined||native.dangerouslySetInnerHTML!==undefined)throw new TypeError('MobEffect content is data-driven; use only the narrow renderText glyph seam');
  validateMobEffectRef(forwardedRef,'MobEffectRow ref');
  if(renderText!==undefined&&typeof renderText!=='function')throw new TypeError('MobEffectRow renderText must be a glyph renderer function');
  // Finish the complete immutable snapshot/geometry BEFORE calling host code.
  const model=resolveMobEffectRowLayout({effect,scale,textProfile,iconLayout});
  const [,attach]=useClassicNodeRef(forwardedRef);
  const asset=model.effect.ambient?mobEffectAssets.ambientBackground:mobEffectAssets.effectBackground;
  const label=(kind:'name'|'timer')=>{
    const layout=model[kind],value=model.effect[kind];
    const context:MobEffectTextContext=Object.freeze({kind,effectId:model.effect.id,font:Object.freeze({...layout.font,fontFamily:layout.family}),
      scale:model.scale,color:layout.color,shadow:layout.shadow,lineHeight:layout.font.lineHeight});
    return <span className={`mc-mob-effect-row__label mc-mob-effect-row__${kind}`} data-source-binding={`#mob_effect_${kind}`}
      data-font-policy={model.textProfile.provenance} data-font-route={layout.font.fontMode} data-source-shadow={kind==='name'?'true':'unspecified'}
      data-web-shadow={String(layout.shadow)} style={{left:layout.x*model.scale,top:layout.y*model.scale,height:layout.font.lineHeight*model.scale,
        fontFamily:layout.family,fontSize:layout.font.fontSize*model.scale,lineHeight:`${layout.font.lineHeight*model.scale}px`,color:layout.color,
        textShadow:layout.shadow?`${model.scale}px ${model.scale}px 0 #000`:'none'}}>
      {renderText?<><span className="mc-mob-effect-row__glyphs" aria-hidden="true">{renderText(value,context)}</span><span className="mc-mob-effect-row__text-alt">{value}</span></>:value}
    </span>;
  };
  const icon=model.icon,source=model.effect.icon;
  const paint:CSSProperties|undefined=icon?{left:icon.paintBox[0]*model.scale,top:icon.paintBox[1]*model.scale,width:icon.paintBox[2]*model.scale,height:icon.paintBox[3]*model.scale}:undefined;
  return <div {...native} ref={attach} className={`mc-mob-effect-row ${className}`} data-effect-id={model.effect.id} data-ambient={String(model.effect.ambient)}
    data-source-control="mob_effect.mob_effect_grid_item" data-source-collection="mob_effects_collection" data-native-certified="false"
    data-icon-policy={model.iconLayout.kind} data-text-layout="literal-intrinsic-single-line-web" style={{...style,position:'relative',boxSizing:'border-box',width:240*model.scale,height:30*model.scale,
      margin:0,padding:0,border:0,flex:'none','--mc-mob-effect-unit':`${model.scale}px`} as CSSProperties}>
    <ClassicSkin asset={asset} width={240} height={30} scale={model.scale} baseClass="mc-mob-effect-skin" className="mc-mob-effect-row__background" errorName="MobEffectRow"/>
    {label('name')}{label('timer')}
    {icon&&source.kind==='known-effect'&&<span aria-hidden="true" className="mc-mob-effect-row__icon" data-effect={source.effect}
      style={{...paint,backgroundImage:mobEffectIconBackgrounds[source.effect]}}/>}
    {icon&&source.kind==='whole-image'&&<Image className="mc-mob-effect-row__icon" src={source.src} sourceSize={source.naturalSize}
      size={[icon.paintBox[2],icon.paintBox[3]]} scale={model.scale} alt="" aria-hidden="true" style={paint}/>}
  </div>;
});
