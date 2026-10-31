import { forwardRef, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useClassicNodeRef } from './classic-screen-lifecycle';
import { classicInputFontFamily, resolveClassicInputFont } from './classic-input-font';
import { inviteAssets } from './invite-assets';
import { InviteLightButton } from './invite-controls';
import { inviteBlocked, inviteCollection, inviteDimension, inviteFlag, inviteScale, inviteText } from './invite-model';
import type { InvitePaginationProps } from './invite-types';

/** Original included/visible pagination stack. Counter and both enabled bindings
 * are independent host inputs; requesting a page changes no collection state. */
export const InvitePagination = forwardRef<HTMLElement, InvitePaginationProps>(function InvitePagination({
  collection, width, included, snapshot, previousLabel, nextLabel, scale = 2, disabled = false, readOnly = false,
  fontMode = 'auto', hidden = false, previousRef, nextRef, previousProps, nextProps, onAction, className = '', style, ...native
}, forwardedRef) {
  inviteCollection(collection); inviteDimension(width, 'InvitePagination width'); inviteScale(scale);
  if (included && width < 67 || !Number.isFinite(width * scale)) throw new RangeError('Included InvitePagination width must fit two 30px controls and the 7px source inset.');
  for (const [name, flag] of Object.entries({ included, visible: snapshot?.visible, previousEnabled: snapshot?.previousEnabled,
    nextEnabled: snapshot?.nextEnabled, disabled, readOnly, hidden })) inviteFlag(flag, name);
  inviteText(snapshot.counterLabel, 'counterLabel'); inviteText(previousLabel, 'previousLabel', true); inviteText(nextLabel, 'nextLabel', true);
  const [root, attach] = useClassicNodeRef(forwardedRef);
  const current = useRef({ collection, included, snapshot, disabled, readOnly, hidden, onAction });
  current.current = { collection, included, snapshot, disabled, readOnly, hidden, onAction };
  const active = (direction: 'previous' | 'next', control: HTMLButtonElement, expectedCollection = collection) => {
    const now = current.current;
    return !!root.current && root.current.contains(control) && !inviteBlocked(root.current) && now.collection === expectedCollection
      && now.included && now.snapshot.visible && !now.disabled && !now.readOnly && !now.hidden
      && (direction === 'previous' ? now.snapshot.previousEnabled : now.snapshot.nextEnabled);
  };
  if (!included) return null;
  const controlsWidth = width - 7, fontRole = resolveClassicInputFont(fontMode, snapshot.counterLabel);
  return <div {...native} ref={attach} className={`mc-invite-pagination ${className}`} hidden={hidden || !snapshot.visible}
    data-invite-collection={collection} data-source-control="friends_pagination_controls"
    data-focus-identifier={`${collection}_pagination_controls`} data-included="true"
    style={{ ...style, width: width * scale, '--mc-invite-unit': `${scale}px` } as CSSProperties}>
    <div className="mc-invite-pagination__padding" aria-hidden="true"/>
    <div className="mc-invite-pagination__controls" style={{ width: controlsWidth * scale }}>
      <InviteLightButton {...previousProps} ref={previousRef} kind="glyph" size={[30, 30]} scale={scale} label={previousLabel}
        glyph={{ src: inviteAssets.arrow_l_default.url, sourceSize: [7, 9] }} fontMode={fontMode}
        disabled={disabled || !snapshot.previousEnabled} readOnly={readOnly} actionTarget="button.previous_friends_page" collection={collection}
        isActive={control => active('previous', control)} data-source-binding="#previous_button_enabled"
        onRequest={detail => { if (active('previous', detail.control)) current.current.onAction?.({ target: 'button.previous_friends_page', collection,
          origin: detail.origin, event: detail.event }); }}/>
      <span className="mc-invite-pagination__counter" data-source-binding="#page_counter_label" data-font-role={fontRole}
        style={{ width: (controlsWidth - 60) * scale, fontFamily: classicInputFontFamily(fontRole) }}>{snapshot.counterLabel}</span>
      <InviteLightButton {...nextProps} ref={nextRef} kind="content" size={[30, 30]} scale={scale} label={nextLabel}
        glyph={{ src: inviteAssets.arrow_r_default.url, sourceSize: [7, 9] }} fontMode={fontMode}
        disabled={disabled || !snapshot.nextEnabled} readOnly={readOnly} actionTarget="button.next_friends_page" collection={collection}
        isActive={control => active('next', control)} data-source-binding="#next_button_enabled"
        onRequest={detail => { if (active('next', detail.control)) current.current.onAction?.({ target: 'button.next_friends_page', collection,
          origin: detail.origin, event: detail.event }); }}/>
    </div>
    <div className="mc-invite-pagination__padding" aria-hidden="true"/>
    <div className="mc-invite-pagination__divider" aria-hidden="true" style={{ width: controlsWidth * scale,
      backgroundImage: `url(${JSON.stringify(inviteAssets.divider3.url)})`, backgroundSize: `${scale}px ${scale}px` }}/>
  </div>;
});
