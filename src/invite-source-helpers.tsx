/** Private dormant Invite source profiles. Never mounted by InviteScreen by default.
 * Host slots preserve unresolved templates/custom renderers instead of repairing them.
 */
import type { CSSProperties, ReactNode } from 'react';
import type { ClassicInputFontMode } from './classic-input-font';
import { ClassicSkin } from './classic-skin';
import { Image } from './image';
import { inviteAssets } from './invite-assets';
import { inviteFont } from './invite-controls';
import { inviteCollection, inviteDimension, inviteFlag, inviteScale, inviteText } from './invite-model';
import type { InviteCollection } from './invite-types';

export type InviteSourceHelperVariant = 'black_border_hover' | 'friend_background_hover'
  | 'friend_background_borderless' | 'grey_borderless_locked' | 'hover_friend_button'
  | 'linked_hover_friend_button' | 'loading_friends' | 'offline_image' | 'panel_text'
  | 'friend_button_test';

interface InviteHelperBox {
  readonly width: number;
  readonly height: number;
  readonly scale?: number;
  readonly className?: string;
}
export interface InviteSourceSlotContext {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
}
export type InviteUnknownSourceName = 'invite.label' | 'invite.friend_button_layout';
export interface InviteUnknownSourceResolution {
  readonly source: InviteUnknownSourceName;
  readonly provenance: 'host-resolved-unknown-source';
  /** Host-owned noninteractive content; no native template/provider is recovered. */
  readonly render: (context: InviteSourceSlotContext & { readonly source: InviteUnknownSourceName }) => ReactNode;
}
export interface InviteUnknownSourceContentProps extends InviteHelperBox {
  readonly source: InviteUnknownSourceName;
  readonly resolution: InviteUnknownSourceResolution;
}

function box({ width, height, scale = 2 }: InviteHelperBox): InviteSourceSlotContext {
  return { width: inviteDimension(width, 'Invite helper width'), height: inviteDimension(height, 'Invite helper height'), scale: inviteScale(scale) };
}
function resolvedUnknown(source: InviteUnknownSourceName, resolution: InviteUnknownSourceResolution, context: InviteSourceSlotContext): ReactNode {
  if (!resolution || resolution.source !== source || resolution.provenance !== 'host-resolved-unknown-source' || typeof resolution.render !== 'function') {
    throw new TypeError(`Invite ${source} requires explicitly tagged host-resolved unknown source content`);
  }
  return resolution.render({ ...context, source });
}

/** Also usable by the root's frame_label wrapper: invite.label stays unresolved.
 * Width/height are a host resolution, not the unknown parent's recovered geometry.
 */
export function InviteUnknownSourceContent(props: InviteUnknownSourceContentProps) {
  const context = box(props);
  if (props.source !== 'invite.label' && props.source !== 'invite.friend_button_layout') throw new TypeError('Unknown Invite unresolved source name');
  return <span className={`mc-invite-unknown-source ${props.className ?? ''}`}
    data-invite-unknown-source={props.source} data-source-provenance="host-resolved-unknown-source"
    style={{ width: context.width * context.scale, height: context.height * context.scale }}>
    {resolvedUnknown(props.source, props.resolution, context)}
  </span>;
}

export interface InviteHoverTextRenderer {
  readonly provenance: 'host-rendered-hover_text_renderer';
  readonly render: (context: InviteSourceSlotContext & {
    readonly text: string;
    readonly collection: InviteCollection;
    readonly sourceBinding: '#hover_text';
    readonly sourceRenderer: 'hover_text_renderer';
    readonly sourceLayer: 30;
    readonly maxWidth: 0;
  }) => ReactNode;
}
interface InviteHoverInputs {
  readonly collection: InviteCollection;
  readonly hoverText: string;
  readonly hoverRenderer: InviteHoverTextRenderer;
}
export interface InviteMsaSourceResolution {
  readonly source: 'invite.msa_friend_button';
  readonly provenance: 'host-resolved-inherited-source';
  /** Host may compose the real MSA row. No automatic input/controller/provider is fabricated. */
  readonly render: (context: InviteSourceSlotContext & {
    readonly source: 'invite.msa_friend_button';
    readonly checkboxSize: readonly [number, number];
    readonly authoredCheckboxSize: readonly ['100%', '100%'];
  }) => ReactNode;
}
export type InviteSourceHelperProps = InviteHelperBox & (
  | { readonly variant: 'black_border_hover' | 'friend_background_hover' | 'friend_background_borderless' | 'grey_borderless_locked' }
  | { readonly variant: 'panel_text'; readonly text: string; readonly fontMode?: ClassicInputFontMode; readonly fontSize?: number }
  | { readonly variant: 'loading_friends'; readonly text: string; readonly isLoading: boolean; readonly fontMode?: ClassicInputFontMode; readonly fontSize?: number }
  | { readonly variant: 'offline_image'; readonly collection: InviteCollection; readonly offlineVisible: boolean }
  | ({ readonly variant: 'hover_friend_button'; readonly layout: InviteUnknownSourceResolution } & InviteHoverInputs)
  | ({ readonly variant: 'linked_hover_friend_button' } & InviteHoverInputs)
  | { readonly variant: 'friend_button_test'; readonly msaLayout: InviteMsaSourceResolution }
);

function hoverContent(props: InviteHoverInputs, context: InviteSourceSlotContext): ReactNode {
  inviteCollection(props.collection); inviteText(props.hoverText, 'Invite #hover_text');
  if (!props.hoverRenderer || props.hoverRenderer.provenance !== 'host-rendered-hover_text_renderer' || typeof props.hoverRenderer.render !== 'function') {
    throw new TypeError('Invite common.hover_text requires an explicit host hover_text_renderer');
  }
  return <span className="mc-invite-source-helper__hover" data-source-renderer="hover_text_renderer"
    data-source-binding="#hover_text" data-source-collection={props.collection} data-source-layer="30">
    {props.hoverRenderer.render({ ...context, text: props.hoverText, collection: props.collection, sourceBinding: '#hover_text', sourceRenderer: 'hover_text_renderer', sourceLayer: 30, maxWidth: 0 })}
  </span>;
}

/** Each variant is independently fixtureable and retains its literal source name.
 * Width/height describe an explicitly resolved containing box; only authored child
 * geometry (inset1, label20, status8) is resolved here. Fonts use the finite Web route.
 */
export function InviteSourceHelper(props: InviteSourceHelperProps) {
  const context = box(props), { width, height, scale } = context;
  const style: CSSProperties = { width: width * scale, height: height * scale, '--mc-invite-helper-unit': `${scale}px` } as CSSProperties;
  let content: ReactNode, hidden = false;
  switch (props.variant) {
    case 'black_border_hover':
    case 'grey_borderless_locked':
    case 'friend_background_hover':
    case 'friend_background_borderless': {
      const inset = props.variant.startsWith('friend_background_') ? 1 : 0;
      if (width <= inset * 2 || height <= inset * 2) throw new RangeError('Invite helper background is smaller than its authored inset');
      const asset = props.variant === 'black_border_hover' || props.variant === 'friend_background_hover' ? inviteAssets.MainBannersHover : inviteAssets.disabledButtonNoBorder;
      content = <span className="mc-invite-source-helper__background" style={{ left: inset * scale, top: inset * scale, width: (width - inset * 2) * scale, height: (height - inset * 2) * scale }}>
        <ClassicSkin asset={asset} width={width - inset * 2} height={height - inset * 2} scale={scale} baseClass="mc-invite-skin" errorName="Invite dormant helper" />
      </span>;
      break;
    }
    case 'panel_text':
    case 'loading_friends': {
      inviteText(props.text, 'Invite helper text');
      const fontSize = inviteDimension(props.fontSize ?? 10, 'Invite helper Web font size');
      if (props.variant === 'loading_friends') { inviteFlag(props.isLoading, 'isLoading'); hidden = !props.isLoading; }
      content = <span className={`mc-invite-source-helper__text ${props.variant === 'loading_friends' ? 'mc-invite-source-helper__text--loading' : ''}`}
        data-source-layer="5" data-source-shadow="false" data-source-font-size="normal"
        data-source-binding={props.variant === 'loading_friends' ? '#is_loading' : undefined}
        data-source-text={props.variant === 'loading_friends' ? 'realmsInvitationScreen.loadingFriends' : undefined}
        style={{ ...inviteFont(props.fontMode, props.text), fontSize: fontSize * scale, lineHeight: `${fontSize * scale}px`, width: width * scale, height: (props.variant === 'loading_friends' ? 20 : height) * scale }}>
        {props.text}
      </span>;
      break;
    }
    case 'offline_image': {
      inviteCollection(props.collection); inviteFlag(props.offlineVisible, 'offlineVisible'); hidden = !props.offlineVisible;
      const asset = inviteAssets.offline;
      content = <Image src={asset.url} sourceSize={[asset.width, asset.height]} alt="" className="mc-invite-source-helper__offline"
        data-source-binding="#offline_visible" data-source-collection={props.collection} data-source-size="8,8"
        style={{ width: 8 * scale, height: 8 * scale }} />;
      break;
    }
    case 'hover_friend_button':
      content = <>{<InviteUnknownSourceContent source="invite.friend_button_layout" resolution={props.layout} width={width} height={height} scale={scale} />}{hoverContent(props, context)}</>;
      break;
    case 'linked_hover_friend_button':
      content = hoverContent(props, context);
      break;
    case 'friend_button_test': {
      if (!props.msaLayout || props.msaLayout.source !== 'invite.msa_friend_button' || props.msaLayout.provenance !== 'host-resolved-inherited-source' || typeof props.msaLayout.render !== 'function') {
        throw new TypeError('Invite friend_button_test requires an explicit inherited MSA source layout');
      }
      content = <span className="mc-invite-source-helper__inherited" data-source-inherits="invite.msa_friend_button" data-source-checkbox-size="100%,100%" data-source-provenance="host-resolved-inherited-source">
        {props.msaLayout.render({ ...context, source: 'invite.msa_friend_button', checkboxSize: [width, height], authoredCheckboxSize: ['100%', '100%'] })}
      </span>;
      break;
    }
    default:
      throw new TypeError('Unknown Invite source helper variant');
  }
  return <span className={`mc-invite-source-helper mc-invite-source-helper--${props.variant} ${props.className ?? ''}`}
    data-invite-source-helper={props.variant} data-source-definition={`invite.${props.variant}`} hidden={hidden} style={style}>{content}</span>;
}
