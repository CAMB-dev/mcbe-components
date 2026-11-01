import { forwardRef } from 'react';
import type { CSSProperties } from 'react';
import { useClassicNodeRef } from './classic-screen-lifecycle';
import { mobEffectAssets } from './mob-effect-assets';
import { resolveMobEffectListLayout, resolveMobEffectRowLayout, snapshotMobEffectEntries, snapshotMobEffectProfiles, snapshotMobEffectRowRefs, validateMobEffectRef } from './mob-effect-layout';
import { MobEffectRow } from './mob-effect-row';
import { ScrollArea } from './scroll-area';
import type { MobEffectListProps } from './mob-effect-types';

/** Private actual collection/grid/scroll composition. Source declared150-wide
 * grid and240x30 row extents remain distinct, including intentional clipping. */
export const MobEffectList=forwardRef<HTMLDivElement,MobEffectListProps>(function MobEffectList({
  effects,gridDimensions,size,scale,inputMode,touchThumbVisible,textProfile,iconLayout,layoutPolicy,label,renderText,viewportRef,rowRefs,
  className='',style,...native
},forwardedRef){
  if(native.children!==undefined||native.dangerouslySetInnerHTML!==undefined)throw new TypeError('MobEffect content is data-driven; use only the narrow renderText glyph seam');
  validateMobEffectRef(forwardedRef,'MobEffectList ref');validateMobEffectRef(viewportRef,'MobEffectList viewportRef');
  if(typeof touchThumbVisible!=='boolean')throw new TypeError('MobEffectList touchThumbVisible must be an independent boolean');
  if(typeof label!=='string'||!label.trim()||label.length>4096)throw new TypeError('MobEffectList label must be a nonempty string within4096 units');
  if(renderText!==undefined&&typeof renderText!=='function')throw new TypeError('MobEffectList renderText must be a glyph renderer function');
  const entries=snapshotMobEffectEntries(effects,gridDimensions),profiles=snapshotMobEffectProfiles(textProfile,iconLayout),refs=snapshotMobEffectRowRefs(rowRefs);
  const layout=resolveMobEffectListLayout({size,gridDimensions,effectCount:entries.length,scale,inputMode,layoutPolicy});
  // Snapshot and validate ALL siblings, profiles, refs and geometry before the
  // first renderer can mutate its original host inputs.
  const rows=entries.map(effect=>({model:resolveMobEffectRowLayout({effect,scale,...profiles}),ref:refs&&Object.hasOwn(refs,effect.id)?refs[effect.id]:undefined}));
  const [,attach]=useClassicNodeRef(forwardedRef),[,attachViewport]=useClassicNodeRef(viewportRef);
  const scrollStyle:CSSProperties={position:'absolute',left:layout.scrollRect[0]*scale,top:layout.scrollRect[1]*scale,width:layout.scrollRect[2]*scale,height:layout.scrollRect[3]*scale};
  return <div {...native} ref={attach} className={`mc-mob-effect-list ${className}`} data-source-control="mob_effect.mob_effect_list_content_panel"
    data-layout-policy={layoutPolicy} data-native-certified="false" data-grid-dimensions={layout.gridDimensions.join(',')} data-declared-grid-width="150"
    style={{...style,position:'relative',boxSizing:'border-box',width:layout.size[0]*scale,height:layout.size[1]*scale,margin:0,padding:0,border:0,overflow:'clip',
      '--mc-mob-effect-unit':`${scale}px`,'--mc-mob-effect-mouse-thumb':`url(${JSON.stringify(mobEffectAssets.mouseThumb.url)})`,
      '--mc-mob-effect-track':`url(${JSON.stringify(mobEffectAssets.scrollTrack.url)})`,'--mc-mob-effect-touch-thumb':`url(${JSON.stringify(mobEffectAssets.touchThumb.url)})`} as CSSProperties}>
    <ScrollArea className={`mc-mob-effect-list__scroll mc-mob-effect-list__scroll--${inputMode}`} style={scrollStyle} scale={scale}
      variant={inputMode==='touch'?'touch':'default'} label={label} viewportRef={attachViewport} thumbVisible={inputMode==='touch'?touchThumbVisible:true}
      scrollbarVisibility="auto" minThumbSize={5} contentProps={{style:{height:layout.grid.contentSize[1]*scale,position:'relative'}}}>
      <div className="mc-mob-effect-list__grid" role="list" aria-label={label} data-source-collection="mob_effects_collection"
        style={{position:'absolute',left:layout.grid.offset[0]*scale,top:layout.grid.offset[1]*scale,width:150*scale,height:layout.grid.size[1]*scale}}>
        {rows.map(({model,ref},index)=>{const cell=layout.grid.cells[index]!;return <div key={model.effect.id} className="mc-mob-effect-list__cell" role="presentation"
          data-collection-index={index} data-grid-row={cell.row} data-grid-column={cell.column} style={{position:'absolute',left:cell.rect[0]*scale,top:cell.rect[1]*scale,width:240*scale,height:30*scale}}>
          <MobEffectRow role="listitem" ref={ref} effect={model.effect} scale={model.scale} textProfile={model.textProfile} iconLayout={model.iconLayout} renderText={renderText}/>
        </div>;})}
      </div>
    </ScrollArea>
  </div>;
});
