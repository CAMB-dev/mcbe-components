import { forwardRef, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useClassicNodeRef } from './classic-screen-lifecycle';
import { InviteLightButton } from './invite-controls';
import { inviteBlocked, inviteDimension, inviteFlag, inviteScale, inviteText } from './invite-model';
import type { InviteActionTarget, InviteFooterProps } from './invite-types';

/** Original one/two-level footer. Capability combinations are preserved: Add
 * controls may coexist; Send is never enabled by a selected-person count. */
export const InviteFooter = forwardRef<HTMLElement, InviteFooterProps>(function InviteFooter({
  width, variant, capabilities, findCrossPlatformFriendsEnabled, sendButtonText, gamepadHelperVisible, renderGamepadHelper,
  labels, scale = 2, disabled = false, readOnly = false, fontMode = 'auto', hidden = false, controlRefs, controlProps,
  onAction, className = '', style, ...native
}, forwardedRef) {
  inviteDimension(width, 'InviteFooter width'); inviteScale(scale);
  if (width < 2 || !Number.isFinite(width * scale)) throw new RangeError('InviteFooter requires finite physical geometry and at least 2px logical width.');
  if (variant !== 'horizontal' && variant !== 'vertical') throw new TypeError('Unknown InviteFooter variant.');
  for (const [name, flag] of Object.entries({ isInvitingToRealm: capabilities?.isInvitingToRealm,
    canManageMembers: capabilities?.canManageMembers, supportsAddFriend: capabilities?.supportsAddFriend,
    findCrossPlatformFriendsEnabled, gamepadHelperVisible, disabled, readOnly, hidden })) inviteFlag(flag, name);
  inviteText(sendButtonText, 'sendButtonText'); inviteText(labels?.addFriend, 'addFriend', true); inviteText(labels?.addMember, 'addMember', true);
  if (gamepadHelperVisible && typeof renderGamepadHelper !== 'function') throw new TypeError('Visible Invite gamepad helpers require host artwork.');
  const addFriend = !capabilities.isInvitingToRealm && capabilities.supportsAddFriend, addMember = capabilities.canManageMembers;
  const spacer = !capabilities.isInvitingToRealm || capabilities.canManageMembers ? 2 : 0;
  const addWidth = variant === 'vertical' || capabilities.isInvitingToRealm && !capabilities.canManageMembers ? width : width / 2 - 1;
  const addCount = Number(addFriend) + Number(addMember);
  const sendWidth = variant === 'vertical' ? width : width - addCount * addWidth - spacer;
  const [root, attach] = useClassicNodeRef(forwardedRef);
  const current = useRef({ addFriend, addMember, disabled, readOnly, hidden, findCrossPlatformFriendsEnabled, onAction });
  current.current = { addFriend, addMember, disabled, readOnly, hidden, findCrossPlatformFriendsEnabled, onAction };
  const active = (name: 'addFriend' | 'addMember' | 'send', control: HTMLButtonElement) => {
    const now = current.current;
    return !!root.current && root.current.contains(control) && !inviteBlocked(root.current) && !now.disabled && !now.readOnly && !now.hidden
      && (name === 'send' || name === 'addFriend' && now.addFriend && now.findCrossPlatformFriendsEnabled || name === 'addMember' && now.addMember);
  };
  const button = (name: 'addFriend' | 'addMember' | 'send', label: string, logicalWidth: number) => {
    const target: InviteActionTarget = name === 'send' ? 'button.send_invites' : name === 'addFriend' ? 'button.add_friend' : 'button.add_member';
    const enabled = !disabled && (name !== 'addFriend' || findCrossPlatformFriendsEnabled);
    return <InviteLightButton {...controlProps?.[name]} key={name} ref={controlRefs?.[name]} kind="content" size={[logicalWidth, 30]}
      label={label} scale={scale} fontMode={fontMode} disabled={!enabled} readOnly={readOnly} actionTarget={target} isActive={control => active(name, control)}
      data-invite-footer-control={name} data-focus-override-down="FOCUS_OVERRIDE_STOP"
      data-focus-override-left={variant === 'vertical' ? 'FOCUS_OVERRIDE_STOP' : undefined}
      data-focus-override-right={variant === 'vertical' ? 'FOCUS_OVERRIDE_STOP' : undefined}
      data-source-binding={name === 'addFriend' ? '#find_cross_platform_friends_enabled' : name === 'send' ? '#send_button' : undefined}
      onRequest={detail => { if (active(name, detail.control)) current.current.onAction?.({ target, origin: detail.origin, event: detail.event }); }}>
      {gamepadHelperVisible ? <span className="mc-invite-footer__helper" aria-hidden="true" data-source-helper={name === 'send' ? 'x' : 'y'}>
        <span className="mc-invite-footer__helper-glyph" data-source-size="26,26">
          {renderGamepadHelper?.(name === 'send' ? 'x' : 'y', { label, enabled, scale,
            sourceTextureBinding: name === 'send' ? '#controller_face_left_icon' : '#controller_face_up_icon' })}
        </span>
        <span className="mc-invite-footer__helper-description" data-source-size="fill,100%">
          <span className="mc-invite-footer__helper-label" data-source-offset="-2,0">{label}</span>
        </span>
      </span> : label}
    </InviteLightButton>;
  };
  return <div {...native} ref={attach} hidden={hidden} className={`mc-invite-footer mc-invite-footer--${variant} ${className}`}
    data-source-control={variant === 'horizontal' ? 'horizontal_button_stack_panel' : 'vertical_buttons_top_panel+vertical_buttons_bottom_panel'}
    data-add-friend-included={addFriend} data-add-member-included={addMember} data-send-logical-width={sendWidth}
    data-local-layout-policy={addCount === 2 ? variant === 'horizontal' ? 'source-two-adds-zero-fill' : 'source-two-adds-overlay' : 'source-fixed-fill'}
    style={{ ...style, width: width * scale, height: (variant === 'horizontal' ? 30 : 62) * scale,
      '--mc-invite-unit': `${scale}px` } as CSSProperties}>
    <div className="mc-invite-footer__adds" style={{ width: (variant === 'vertical' ? width : addCount * addWidth) * scale }}>
      {addFriend && button('addFriend', labels.addFriend, addWidth)}
      {addMember && button('addMember', labels.addMember, addWidth)}
    </div>
    {variant === 'horizontal' && <span className="mc-invite-footer__spacer" aria-hidden="true" style={{ width: spacer * scale }}/>}
    <div className="mc-invite-footer__send">{button('send', sendButtonText, sendWidth)}</div>
  </div>;
});
