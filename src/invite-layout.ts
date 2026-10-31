import type { InviteBindings, InviteCapabilities, InviteCategoryData, InviteCollection, InvitePresentation } from './invite-types';
export interface InviteBox { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
/** Finite Web resolution of the named source boxes, not the engine %c/%sm evaluator. */
export function resolveInviteLayout(presentation: InvitePresentation, capabilities: Pick<InviteCapabilities, 'useVerticalButtonStackPanel'|'isInvitingToRealm'|'canManageMembers'|'supportsAddFriend'>) {
  const size = presentation?.availableSize;
  if (!Array.isArray(size) || size.length !== 2 || !size.every(n => Number.isFinite(n) && n > 0)) throw new RangeError('Invite availableSize requires two positive finite logical dimensions.');
  if (!['desktop','pocket'].includes(presentation.sourceProfile)) throw new TypeError('Unknown Invite source profile.');
  const vertical = capabilities.useVerticalButtonStackPanel && (!capabilities.isInvitingToRealm || capabilities.canManageMembers);
  const width = presentation.sourceProfile === 'desktop' ? 317 : size[0] * .703215;
  const height = size[1] - (presentation.sourceProfile === 'desktop' ? 10 : 4), bodyHeight = height - (vertical ? 99 : 65);
  if (width <= 16 || bodyHeight <= 0) throw new RangeError('Invite availableSize must leave positive source frame/body geometry.');
  const frame: InviteBox = { x:(size[0]-width)/2, y:(size[1]-height)/2, width, height };
  const body: InviteBox = { x:8, y:23, width:width-16, height:bodyHeight };
  const footer: InviteBox = { x:7, y:height-(vertical?69:37), width:width-14, height:vertical?62:30 };
  const viewport: InviteBox = { x:1, y:0, width:body.width-2, height:body.height };
  const scrollbar: InviteBox = { x:body.width-6, y:2, width:5, height:body.height-4 };
  if (scrollbar.height <= 0) throw new RangeError('Invite body must contain the source four-unit scrollbar insets.');
  const addFriend=!capabilities.isInvitingToRealm&&capabilities.supportsAddFriend,addMember=capabilities.canManageMembers,addCount=Number(addFriend)+Number(addMember);
  const addWidth=vertical||capabilities.isInvitingToRealm&&!capabilities.canManageMembers?footer.width:footer.width/2-1,spacer=!capabilities.isInvitingToRealm||capabilities.canManageMembers?2:0;
  const sendWidth=vertical?footer.width:addCount===2?0:footer.width-addCount*addWidth-spacer;
  const trace = Object.freeze([
    { role:'frame', source:'common.base_screen/$large_screen_size', box:frame, formula:presentation.sourceProfile==='desktop'?'317 × (availableH−10), centered':'70.3215%availableW × (availableH−4), centered' },
    { role:'underfill', source:'common.dialog_background_hollow_common/control', box:{x:4,y:4,width:width-8,height:height-8}, formula:'W−8 ×H−8; centered; fill_alpha .8; layer −1 relative to hollow image' },
    { role:'body', source:`common_dialogs.main_panel_${vertical?'two_buttons':'one_button'}/panel_indent`, box:body, formula:vertical?'W−16 × H−99; top-middle offset(0,23)':'W−16 × H−65; top-middle offset(0,23)' },
    { role:'footer', source:vertical?'common_dialogs.main_panel_two_buttons/top+bottom_button_panel':'common_dialogs.main_panel_one_button/bottom_button_panel', box:footer, formula:vertical?'W−14; 30-unit levels at H−69 and H−37':'W−14 ×30 at H−37' },
    { role:'footer-local-controls', source:vertical?'invite.vertical_buttons_top_panel+bottom_panel':'invite.horizontal_button_stack_panel', box:null, formula:'Add fixed50%−1 (vertical100%); horizontal spacer2 unless realm&&!manage; Send fill', controls:{addFriend:{included:addFriend,box:{x:0,y:0,width:addWidth,height:30}},addMember:{included:addMember,box:{x:vertical?0:Number(addFriend)*addWidth,y:0,width:addWidth,height:30}},send:{included:true,box:{x:vertical?0:addCount*addWidth+spacer,y:vertical?32:0,width:sendWidth,height:30}}}, policy:addCount===2?vertical?'finite Web source-order overlay of both Add controls; native hit/focus unknown':'finite Web two Add controls consume all horizontal fill; zero-width Send stays included/enabled and explicit controller_select remains allowed; native stack/hit/focus unknown':'finite Web fixed/fill local boxes; enabled flags independent of selection' },
    { role:'viewport', source:'invite.scrolling_area', box:viewport, formula:'pane W−2 ×H, offset(1,0)' },
    { role:'scrollbar', source:'invite.scrolling_area', box:scrollbar, formula:'5 × (H−4), right padding1, finite center-Y' },
    { role:'content', source:'invite.scrolling_content_stack', box:{x:0,y:0,width:viewport.width+6,height:null}, formula:'viewportW+6; vertical source order; %c resolved by Web flow, +1 bottom unit' },
  ]);
  return Object.freeze({ variant:vertical?'vertical' as const:'horizontal' as const, frame, body, footer, viewport, scrollbar, contentWidth:viewport.width+6, trace });
}

/** Source-order vertical flow. Hidden branches consume zero flow space under
 * this finite Web policy; text %c comes from its measured Web box, never a font oracle. */
export function resolveInviteFlow(width:number, capabilities:InviteCapabilities, bindings:InviteBindings, categories:Readonly<Record<InviteCollection,InviteCategoryData>>, crossDisabledHeight:number) {
  if(!Number.isFinite(width)||width<=8||!Number.isFinite(crossDisabledHeight)||crossDisabledHeight<8)throw new RangeError('Invite flow requires finite positive content/text extents.');
  const entries:{role:string;source:string;visible:boolean;box:InviteBox;policy?:string}[]=[];let y=0;
  const add=(role:string,source:string,visible:boolean,height:number,localWidth=width,x=0,policy?:string)=>{entries.push({role,source,visible,box:{x,y,width:localWidth,height},policy});if(visible)y+=height;};
  const header=(role:string,collection:InviteCollection)=>add(role,'invite.scrolling_content_stack/'+role,bindings.categoryVisible[collection],10,width,0,'frame_label own offset(1,2), height10; invite.label base unresolved');
  const category=(collection:InviteCollection)=>{const d=categories[collection];add(collection,'invite.friends_category',bindings.categoryVisible[collection],d.grid.rows*(collection.includes('linked_account')?56:30)+(capabilities.usePagination&&d.pagination.visible?39:0)+4);};
  add('party','invite.invite_party_panel',bindings.isPartySystemAvailable,40,width*.96,width*.02);
  add('error','invite.scrolling_content_stack/message',!capabilities.hideErrorMessage,12,width,0,'finite Web own-label child extent10 + top offset2; unresolved invite.label base');
  header('online_platform','online_platform_friends');add('vertical_padding_0','invite.scrolling_content_stack',capabilities.platformInvitesVisible,2);category('online_platform_friends');
  add('crossplatform_disabled_panel','invite.scrolling_content_stack',!bindings.crossPlatformEnabled,crossDisabledHeight,width-8,4,'measured Web default text extent +8; centered local stack anchor');
  add('crossplatform_disable_spacer','invite.scrolling_content_stack',!bindings.crossPlatformEnabled,5);
  header('online_cross_platform','online_xbox_live_friends');add('vertical_padding_1','invite.scrolling_content_stack',true,1);category('online_linked_account_friends');category('online_xbox_live_friends');
  header('offline_platform','offline_platform_friends');add('vertical_padding_2','invite.scrolling_content_stack',capabilities.platformInvitesVisible,1);category('offline_platform_friends');add('no_platform_friends','invite.scrolling_content_stack',bindings.noPlatformFriendsVisible,30);
  header('offline_cross_platform','offline_xbox_live_friends');add('vertical_padding_3','invite.scrolling_content_stack',true,1);category('offline_linked_account_friends');category('offline_xbox_live_friends');add('no_xbox_live_friends','invite.scrolling_content_stack',bindings.noXboxLiveFriendsVisible,30);
  add('bottom_extent','invite.scrolling_content_stack/100%c+1',true,1);
  return Object.freeze({entries:Object.freeze(entries),stackHeight:y,contentHeight:bindings.isLoading?8:y,stackHidden:bindings.isLoading,loadingHeight:8});
}
