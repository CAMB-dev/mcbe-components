import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { CSSProperties, SyntheticEvent } from 'react';
import { classicModalTab, deferClassicEvent, deferClassicRequest, scheduleClassicTask, useClassicLayoutEffect, useClassicModal, useClassicNodeRef } from './classic-screen-lifecycle';
import { ClassicSkin } from './classic-skin';
import { ScrollArea } from './scroll-area';
import { InviteCategory } from './invite-category';
import { InviteFooter } from './invite-footer';
import { InviteLoading, InvitePartyPanel, inviteFont } from './invite-controls';
import { inviteAssets } from './invite-assets';
import { inviteBlocked, inviteCollections, inviteCollection, inviteFlag, inviteIdentityFor, invitePerson, inviteScale, inviteScopeKey, inviteText } from './invite-model';
import { InviteOwnerContext } from './invite-owner';
import type { InviteOwnedControl, InviteOwner } from './invite-owner';
import type { InviteActionDetail, InviteCollection, InviteControllerCommand, InviteControllerHandle, InvitePartyDetail, InviteScope, InviteScreenProps, InviteSelection, InviteSelectionDetail } from './invite-types';
import { resolveInviteFlow, resolveInviteLayout } from './invite-layout';
export type { InviteScreenProps } from './invite-types';

const own = <T,>(record: Readonly<Partial<Record<InviteCollection,T>>>|undefined,key:InviteCollection):T|undefined => record && Object.hasOwn(record,key) ? record[key] : undefined;
function copySelection(value: InviteSelection): InviteSelection {
  if (!value || !Array.isArray(value.selected) || [...value.selected].some(scope=>!scope)) throw new TypeError('Invite selection requires dense scoped selected identities.');
  inviteFlag(value.inviteToParty,'inviteToParty'); const seen = new Set<string>();
  return Object.freeze({ selected:Object.freeze(value.selected.map(scope => { const key=inviteScopeKey(scope);if(seen.has(key))throw new TypeError('Invite selection scopes must be unique.');seen.add(key);return Object.freeze({collection:scope.collection,itemId:scope.itemId}); })),inviteToParty:value.inviteToParty });
}
function exactCollections(value: unknown,name: string) {
  if (!value || typeof value!=='object' || Object.keys(value).length!==6 || inviteCollections.some(key=>!Object.hasOwn(value,key))) throw new TypeError(`${name} requires exactly six original collection keys.`);
}
function validate(props: Pick<InviteScreenProps,'presentation'|'capabilities'|'bindings'|'categories'|'labels'|'errorMessageText'|'renderGamepadHelper'>) {
  const {presentation:p,capabilities:c,bindings:b,categories,labels}=props;
  if(!p||!c||!b||!labels)throw new TypeError('Invite presentation, capabilities, bindings and labels are required.');
  inviteScale(p.scale);if(!['mouse','touch'].includes(p.inputMode))throw new TypeError('Unknown Invite inputMode.');inviteFlag(p.touchThumbVisible,'touchThumbVisible');
  if(p.minThumbSize!==undefined&&(!Number.isFinite(p.minThumbSize)||p.minThumbSize<=0))throw new RangeError('Invite minThumbSize must be positive and finite.');
  for(const key of ['isInvitingToRealm','canManageMembers','supportsAddFriend','useVerticalButtonStackPanel','isPs4','xboxOne','platformInvitesVisible','usePagination','hideErrorMessage'] as const)inviteFlag(c[key],key);
  if(!c.platformIcons)throw new TypeError('Invite platformIcons capability is required.');inviteFlag(c.platformIcons.visible,'platformIcons.visible');
  if(c.platformIcons.visible&&(typeof c.platformIcons.render!=='function'||c.platformIcons.provenance!=='host-supplied-missing-platform-icon'))throw new TypeError('Visible missing platform icon requires its explicit host renderer/provenance.');
  for(const key of ['isLoading','crossPlatformEnabled','noPlatformFriendsVisible','noXboxLiveFriendsVisible','findCrossPlatformFriendsEnabled','gamepadHelperVisible','closeButtonVisible','isPartySystemAvailable','canInviteToParty'] as const)inviteFlag(b[key],key);
  for(const key of ['noXboxLiveFriendsText','sendButtonText','buttonADescription'] as const)inviteText(b[key],key);
  exactCollections(b.categoryVisible,'categoryVisible');exactCollections(categories,'categories');
  for(const collection of inviteCollections){inviteFlag(b.categoryVisible[collection],`${collection} visible`);const data=categories[collection];if(!data||data.collection!==collection)throw new TypeError('Invite category key and source collection must agree.');
    const columns=data.grid?.columns,rows=data.grid?.rows;if(!Number.isSafeInteger(columns)||columns<0||!Number.isSafeInteger(rows)||rows<0||!Number.isSafeInteger(columns*rows))throw new RangeError('Invite grid requires nonnegative integer dimensions.');
    if(!Array.isArray(data.people)||[...data.people].some(person=>!person)||data.people.length>columns*rows)throw new RangeError('Invite people must be dense and fit explicit source grid capacity.');const ids=new Set<string>();data.people.forEach((person,index)=>{invitePerson(person,{collection,itemId:person.id,collectionIndex:index});if(ids.has(person.id))throw new TypeError('Invite category item ids must be unique.');ids.add(person.id);});
    inviteText(data.ttsSectionHeader,'ttsSectionHeader');if(!data.pagination)throw new TypeError('Invite pagination snapshot is required even when excluded.');for(const key of ['visible','previousEnabled','nextEnabled'] as const)inviteFlag(data.pagination[key],`pagination.${key}`);inviteText(data.pagination.counterLabel,'counterLabel');}
  for(const key of ['title','realmTitle','onlinePlatform','offlinePlatform','onlineCrossPlatform','offlineCrossPlatform','noPlatformFriends','crossPlatformDisabled','partyTitle','partyDescription','addFriend','addMember','profile','previousPage','nextPage','close','loading','scrollArea'] as const)inviteText(labels[key],key,['close','scrollArea'].includes(key));
  if(typeof labels.friendSelection!=='function')throw new TypeError('Invite friendSelection label function is required.');inviteText(props.errorMessageText,'errorMessageText');
  if(b.gamepadHelperVisible&&typeof props.renderGamepadHelper!=='function')throw new TypeError('Visible Invite gamepad helpers require host renderer artwork.');
}

/** Fixed original Invite scopes and source layout boxes; all account/social IO belongs to the host. */
export const InviteScreen = forwardRef<HTMLElement,InviteScreenProps>(function InviteScreen({
  presentation,capabilities,bindings,categories,labels,errorMessageText,value,defaultValue,onSelectionChange,onAction,renderGamepadHelper,
  open=true,visible=true,modal=false,disabled=false,readOnly=false,viewportRef,categoryRefs,paginationRefs,partyRef,partyProps,closeRef,closeProps={},footerControlRefs,controllerRef,
  hidden=false,className='',style,onKeyDown,onCompositionStart,onCompositionEnd,...native
},forwardedRef){
  validate({presentation,capabilities,bindings,categories,labels,errorMessageText,renderGamepadHelper});
  for(const[name,v]of Object.entries({open,visible,modal,disabled,readOnly,hidden}))inviteFlag(v,name);
  if(defaultValue!==undefined)copySelection(defaultValue);
  const [local,setLocal]=useState<InviteSelection>(()=>copySelection(defaultValue??{selected:[],inviteToParty:false})),initial=useRef(local),selection=value===undefined?local:copySelection(value);
  const geometry=resolveInviteLayout(presentation,capabilities),s=presentation.scale;
  if(![...presentation.availableSize,geometry.frame.width,geometry.frame.height].every(n=>Number.isFinite(n*s)))throw new RangeError('Invite physical geometry must be finite.');
  const [root,attach]=useClassicNodeRef(forwardedRef),[frame,attachFrame]=useClassicNodeRef<HTMLDivElement>(),[close,attachClose]=useClassicNodeRef(closeRef),[,attachViewport]=useClassicNodeRef(viewportRef),[cross,attachCross]=useClassicNodeRef<HTMLDivElement>(),[crossHeight,setCrossHeight]=useState(18),composing=useRef(false),records=useRef(new Set<InviteOwnedControl>());
  const active=open&&visible&&!hidden;
  const current=useRef({active,disabled,readOnly,bindings,categories,selection,controlled:value!==undefined,onSelectionChange,onAction});current.current={active,disabled,readOnly,bindings,categories,selection,controlled:value!==undefined,onSelectionChange,onAction};
  const rootActive=()=>!!root.current&&!inviteBlocked(root.current)&&current.current.active&&!current.current.disabled;
  const hasScope=(scope:InviteScope)=>{const now=current.current,data=now.categories[scope.collection];return !!data&&now.bindings.categoryVisible[scope.collection]&&!now.bindings.isLoading&&data.people.some(person=>person.id===scope.itemId&&person.identity===inviteIdentityFor(scope.collection));};
  const owner=useMemo<InviteOwner>(()=>({owns:(control,scope)=>rootActive()&&!!root.current?.contains(control)&&!inviteBlocked(control)&&(!scope||hasScope(scope)),register:entry=>{records.current.add(entry);return()=>{records.current.delete(entry);};}}),[]);
  useClassicModal(root,frame,modal&&active);
  // %c/default text height is resolved from the existing Web font's real box;
  // no native glyph advances or inherited invite.label properties are inferred.
  useClassicLayoutEffect(()=>{const node=cross.current;if(!node||bindings.crossPlatformEnabled)return;const measure=()=>{const height=node.getBoundingClientRect().height/s;if(Number.isFinite(height)&&height>0)setCrossHeight(previous=>previous===height?previous:height);};measure();const Observer=node.ownerDocument.defaultView?.ResizeObserver,observer=Observer?new Observer(measure):undefined;observer?.observe(node);return()=>observer?.disconnect();},[bindings.crossPlatformEnabled,bindings.isLoading,geometry.contentWidth,labels.crossPlatformDisabled,s]);
  useClassicLayoutEffect(()=>{const node=root.current,form=node?.closest('form');if(!node||!form)return;const reset=(event:Event)=>scheduleClassicTask(node,()=>{if(event.defaultPrevented||root.current!==node||!node.isConnected||current.current.controlled)return;const next=copySelection(initial.current);current.current.selection=next;setLocal(next);});form.addEventListener('reset',reset);return()=>form.removeEventListener('reset',reset);});
  const commit=(next:InviteSelection,detail:InviteSelectionDetail|InvitePartyDetail)=>{const now=current.current;if(!rootActive()||now.readOnly)return;if(detail.event&&!root.current?.contains(detail.event.currentTarget))return;if('collection'in detail&&!hasScope(detail))return;const snapshot=copySelection(next);if(!now.controlled){current.current.selection=snapshot;setLocal(snapshot);}now.onSelectionChange?.(snapshot,detail);};
  const selected=(detail:InviteSelectionDetail)=>{const now=current.current,key=inviteScopeKey(detail),next=now.selection.selected.filter(scope=>inviteScopeKey(scope)!==key);if(detail.selected)next.push({collection:detail.collection,itemId:detail.itemId});commit({selected:next,inviteToParty:now.selection.inviteToParty},detail);};
  const party=(detail:InvitePartyDetail)=>{if(!current.current.bindings.isPartySystemAvailable||!current.current.bindings.canInviteToParty||current.current.bindings.isLoading)return;commit({selected:current.current.selection.selected,inviteToParty:detail.value},detail);};
  const relay=(detail:InviteActionDetail)=>{if(!rootActive()||current.current.readOnly&&detail.target!=='button.menu_exit'||detail.event&&(detail.event.defaultPrevented||detail.event.nativeEvent.defaultPrevented||!root.current?.contains(detail.event.currentTarget)))return;if('itemId'in detail&&!hasScope(detail))return;current.current.onAction?.(detail);};
  const exit=(origin:'control'|'escape'|'host-controller',event?:SyntheticEvent<HTMLElement>,requiredClose?:HTMLButtonElement)=>{const control=event?.currentTarget??requiredClose??root.current,needsClose=origin==='control'||requiredClose!==undefined;if(!control||!rootActive()||!root.current?.contains(control)||needsClose&&!current.current.bindings.closeButtonVisible)return false;
    const run=(snapshot?:SyntheticEvent<HTMLElement>)=>current.current.onAction?.({target:'button.menu_exit',origin,event:snapshot});const valid=()=>rootActive()&&!!root.current?.contains(control)&&(!needsClose||close.current===control&&current.current.bindings.closeButtonVisible)&&!inviteBlocked(control);
    if(event)deferClassicRequest(event,control,snapshot=>run(snapshot),valid);else scheduleClassicTask(control,()=>{if(valid())run();});return true;};
  const requestRef=useRef<(command:InviteControllerCommand)=>boolean>(()=>false);requestRef.current=command=>{
    if(!command||!rootActive())return false;const from=command.fromButtonId,destination=command.destination;if(current.current.readOnly&&destination!=='button.menu_exit')return false;
    if(from==='button.menu_cancel')return destination==='button.menu_exit'&&command.collection===undefined&&command.itemId===undefined?exit('host-controller'):false;
    const ordinary=from==='button.menu_select'||from==='button.menu_ok';
    if(!ordinary&&!(from==='button.controller_select'&&destination==='button.send_invites')&&!(from==='button.controller_secondary_select'&&(destination==='button.add_friend'||destination==='button.add_member')))return false;
    const person=destination==='friend-toggle'||destination==='button.view_profile',page=destination==='button.previous_friends_page'||destination==='button.next_friends_page';
    if(person||page){try{inviteCollection(command.collection);}catch{return false;}if(person&&(typeof command.itemId!=='string'||!command.itemId.trim())||page&&command.itemId!==undefined)return false;}else if(command.collection!==undefined||command.itemId!==undefined)return false;
    const matches=[...records.current].filter(record=>{if(!owner.owns(record.control,'scope'in record?record.scope:undefined))return false;if(destination==='friend-toggle')return record.kind==='selection'&&record.scope.collection===command.collection&&record.scope.itemId===command.itemId;if(destination==='party-toggle')return record.kind==='party';return record.kind==='action'&&record.target===destination&&(person?record.scope?.collection===command.collection&&record.scope?.itemId===command.itemId:page?record.collection===command.collection:true);});
    return matches.length===1?matches[0]!.request():false;
  };
  const handle=useMemo<InviteControllerHandle>(()=>({request:command=>requestRef.current(command)}),[]);useImperativeHandle(controllerRef,()=>handle,[handle]);
  useClassicLayoutEffect(()=>{const control=close.current;if(!control)return;return owner.register({kind:'action',target:'button.menu_exit',control,request:()=>{if(!current.current.bindings.closeButtonVisible||inviteBlocked(control))return false;return exit('host-controller',undefined,control);}});});
  const box=(value:{x:number;y:number;width:number;height:number}):CSSProperties=>({left:value.x*s,top:value.y*s,width:value.width*s,height:value.height*s});
  const rootStyle={...style,width:presentation.availableSize[0]*s,height:presentation.availableSize[1]*s,'--mc-invite-unit':`${s}px`,...inviteFont(presentation.fontMode,labels.title+errorMessageText),'--mc-invite-close-normal':`url(${JSON.stringify(inviteAssets.close_button_default.url)})`,'--mc-invite-close-hover':`url(${JSON.stringify(inviteAssets.close_button_hover.url)})`,'--mc-invite-close-pressed':`url(${JSON.stringify(inviteAssets.close_button_pressed.url)})`,'--mc-skin-scroll-track':`url(${JSON.stringify(inviteAssets.ScrollRail.url)})`,'--mc-skin-scroll-thumb':`url(${JSON.stringify(inviteAssets.ScrollHandle.url)})`,'--mc-scroll-edge':`${s}px`,'--mc-scroll-thumb-edge-y':`${2*s}px`} as CSSProperties;
  const category=(collection:InviteCollection)=><InviteCategory key={collection} ref={own(categoryRefs,collection)} paginationRef={own(paginationRefs,collection)} data={categories[collection]} width={geometry.contentWidth} visible={bindings.categoryVisible[collection]} selected={selection.selected} capabilities={capabilities} crossPlatformEnabled={bindings.crossPlatformEnabled} labels={labels} scale={s} disabled={disabled} readOnly={readOnly} fontMode={presentation.fontMode} onSelectedChange={selected} onAction={relay}/>;
  const flow=resolveInviteFlow(geometry.contentWidth,capabilities,bindings,categories,crossHeight);
  const header=(kind:string,text:string,show:boolean)=><div className={`mc-invite-screen__header mc-invite-screen__header--${kind}`} hidden={!show} data-invite-header={kind}><span style={inviteFont(presentation.fontMode,text)} data-source-unresolved-base="invite.label" data-layout-policy="finite-web-own-label-properties">{text}</span></div>;
  return <InviteOwnerContext.Provider value={owner}><section {...native} ref={attach} hidden={!active} className={`mc-invite-screen ${className}`} style={rootStyle} tabIndex={native.tabIndex??-1} aria-label={native['aria-label']??(capabilities.isInvitingToRealm?labels.realmTitle:labels.title)} data-source-profile={presentation.sourceProfile} data-invite-variant={geometry.variant} data-invite-layout={JSON.stringify(geometry.trace)}
    onCompositionStart={event=>{onCompositionStart?.(event);composing.current=true;}} onCompositionEnd={event=>{onCompositionEnd?.(event);composing.current=false;}} onKeyDown={event=>{onKeyDown?.(event);if(event.defaultPrevented||event.nativeEvent.defaultPrevented||composing.current||event.nativeEvent.isComposing||event.nativeEvent.keyCode===229||event.altKey||event.ctrlKey||event.metaKey)return;if(event.key==='Tab'&&modal){deferClassicEvent(event,event.currentTarget,snapshot=>classicModalTab(snapshot,root.current,frame.current),()=>current.current.active);return;}if(event.key==='Escape'&&!event.shiftKey&&!event.repeat)exit('escape',event);}}>
    <div ref={attachFrame} className="mc-invite-screen__frame" style={box(geometry.frame)} role={modal&&active?'dialog':undefined} aria-modal={modal&&active||undefined} aria-label={capabilities.isInvitingToRealm?labels.realmTitle:labels.title} tabIndex={-1}>
      <span className="mc-invite-screen__underfill" aria-hidden="true"><ClassicSkin asset={inviteAssets.control} width={geometry.frame.width-8} height={geometry.frame.height-8} scale={s} baseClass="mc-invite-skin" errorName="Invite"/></span>
      <ClassicSkin className="mc-invite-screen__skin" asset={inviteAssets[geometry.variant==='vertical'?'dialog_background_hollow_1':'dialog_background_hollow_2']} width={geometry.frame.width} height={geometry.frame.height} scale={s} baseClass="mc-invite-skin" errorName="Invite"/>
      <h2 className="mc-invite-screen__title" style={inviteFont(presentation.fontMode,capabilities.isInvitingToRealm?labels.realmTitle:labels.title)}>{capabilities.isInvitingToRealm?labels.realmTitle:labels.title}</h2>
      <button {...closeProps} ref={attachClose} type="button" data-invite-action="button.menu_exit" className={`mc-invite-screen__close ${closeProps.className??''}`} style={{...closeProps.style,width:21*s,height:21*s,top:0,right:0,left:'auto',bottom:'auto'}} hidden={!bindings.closeButtonVisible||closeProps.hidden} disabled={disabled} aria-label={closeProps['aria-label']??labels.close} onClick={event=>{closeProps.onClick?.(event);exit('control',event);}}><span aria-hidden="true"/></button>
      <div className="mc-invite-screen__body" style={box(geometry.body)}><ScrollArea className="mc-invite-screen__scroll" variant={presentation.inputMode==='touch'?'touch':'document'} scale={s} label={labels.scrollArea} viewportRef={attachViewport} minThumbSize={presentation.minThumbSize} thumbVisible={presentation.inputMode==='touch'?presentation.touchThumbVisible:undefined} viewportProps={{style:{width:geometry.viewport.width*s,height:geometry.viewport.height*s,left:s}}} contentProps={{style:{width:geometry.contentWidth*s}}}>
        <div className="mc-invite-screen__progress" data-source-size="100%,100%c">
          <div className="mc-invite-screen__loading" hidden={!bindings.isLoading}><InviteLoading label={labels.loading} scale={s}/></div>
          <div className="mc-invite-screen__stack" hidden={bindings.isLoading} data-source-size="100%+6,100%c+1" data-invite-flow-layout={JSON.stringify(flow)}>
            <InvitePartyPanel width={geometry.contentWidth*.96} title={labels.partyTitle} description={labels.partyDescription} value={selection.inviteToParty} visible={bindings.isPartySystemAvailable} enabled={bindings.canInviteToParty} disabled={disabled} readOnly={readOnly} scale={s} fontMode={presentation.fontMode} inputRef={partyRef} inputProps={partyProps} onValueChange={party}/>
            <div className="mc-invite-screen__error" hidden={capabilities.hideErrorMessage} data-source-unresolved-base="invite.label" data-layout-policy="finite-web-own-label-properties" style={inviteFont(presentation.fontMode,errorMessageText)}><span>{errorMessageText}</span></div>
            {header('online-platform',labels.onlinePlatform,bindings.categoryVisible.online_platform_friends)}
            <div className="mc-invite-screen__padding" hidden={!capabilities.platformInvitesVisible} style={{height:2*s}} aria-hidden="true"/>{category('online_platform_friends')}
            <div ref={attachCross} className="mc-invite-screen__cross-disabled" hidden={bindings.crossPlatformEnabled} data-source-height="100%c+8" data-layout-policy="finite-web-measured-text-box" data-source-unresolved="native default text height" style={inviteFont(presentation.fontMode,labels.crossPlatformDisabled)}><ClassicSkin asset={inviteAssets.mainbanners} width={geometry.contentWidth-8} height={crossHeight} scale={s} baseClass="mc-invite-skin" errorName="Invite"/><span>{labels.crossPlatformDisabled}</span></div>
            <div className="mc-invite-screen__padding" hidden={bindings.crossPlatformEnabled} style={{height:5*s}} aria-hidden="true"/>
            {header('online-cross-platform',labels.onlineCrossPlatform,bindings.categoryVisible.online_xbox_live_friends)}<div className="mc-invite-screen__padding" style={{height:s}} aria-hidden="true"/>{category('online_linked_account_friends')}{category('online_xbox_live_friends')}
            {header('offline-platform',labels.offlinePlatform,bindings.categoryVisible.offline_platform_friends)}<div className="mc-invite-screen__padding" hidden={!capabilities.platformInvitesVisible} style={{height:s}} aria-hidden="true"/>{category('offline_platform_friends')}
            <div className="mc-invite-screen__empty" hidden={!bindings.noPlatformFriendsVisible} data-invite-empty="platform"><span style={inviteFont(presentation.fontMode,labels.noPlatformFriends)} data-source-unresolved-base="invite.label" data-layout-policy="finite-web-own-label-properties">{labels.noPlatformFriends}</span></div>
            {header('offline-cross-platform',labels.offlineCrossPlatform,bindings.categoryVisible.offline_xbox_live_friends)}<div className="mc-invite-screen__padding" style={{height:s}} aria-hidden="true"/>{category('offline_linked_account_friends')}{category('offline_xbox_live_friends')}
            <div className="mc-invite-screen__empty" hidden={!bindings.noXboxLiveFriendsVisible} data-invite-empty="xbox-live"><span style={inviteFont(presentation.fontMode,bindings.noXboxLiveFriendsText)} data-source-unresolved-base="invite.label" data-layout-policy="finite-web-own-label-properties">{bindings.noXboxLiveFriendsText}</span></div>
          </div>
        </div>
      </ScrollArea></div>
      <InviteFooter className="mc-invite-screen__footer" style={{left:geometry.footer.x*s,top:geometry.footer.y*s}} width={geometry.footer.width} variant={geometry.variant} capabilities={capabilities} findCrossPlatformFriendsEnabled={bindings.findCrossPlatformFriendsEnabled} sendButtonText={bindings.sendButtonText} gamepadHelperVisible={bindings.gamepadHelperVisible} renderGamepadHelper={renderGamepadHelper} labels={labels} scale={s} disabled={disabled} readOnly={readOnly} fontMode={presentation.fontMode} controlRefs={footerControlRefs} onAction={relay}/>
    </div>
    <div className="mc-invite-screen__helper" hidden={!bindings.gamepadHelperVisible} aria-hidden="true" data-source-control="common.gamepad_helper_a" data-source-size="100%c,26" data-layout-policy="finite-web-natural-label-plus2">
      <span className="mc-invite-screen__helper-glyph" data-source-texture-binding="#controller_face_down_icon">{bindings.gamepadHelperVisible&&renderGamepadHelper?.('a',{label:bindings.buttonADescription,enabled:!disabled&&!readOnly,scale:s,sourceTextureBinding:'#controller_face_down_icon'})}</span>
      <span className="mc-invite-screen__helper-description" data-source-size="100%c+2,26"><span className="mc-invite-screen__helper-label" style={inviteFont(presentation.fontMode,bindings.buttonADescription)} data-source-binding="#button_a_description" data-source-offset="-2,0" data-source-shadow="true" data-web-shadow-policy="one-logical-pixel-classic-shadow">{bindings.buttonADescription}</span></span>
    </div>
  </section></InviteOwnerContext.Provider>;
});
