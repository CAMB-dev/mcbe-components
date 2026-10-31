import { forwardRef, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { scheduleClassicTask, useClassicLayoutEffect, useClassicNodeRef } from './classic-screen-lifecycle';
import { inviteBlocked, inviteCollection, inviteDimension, inviteFlag, invitePerson, inviteScale, inviteScopeKey, inviteText } from './invite-model';
import { InvitePersonRow } from './invite-person-row';
import { InvitePagination } from './invite-pagination';
import type { InviteCategoryProps, InviteSelection, InviteSelectionDetail } from './invite-types';

function selectionCopy(value: InviteSelection['selected']): InviteSelection['selected'] {
  if (!Array.isArray(value)) throw new TypeError('Invite selected must be an array of scoped identities.');
  const seen = new Set<string>();
  return Object.freeze(value.map(scope => {
    const key = inviteScopeKey(scope);
    if (seen.has(key)) throw new TypeError('Invite selected scopes must be unique.');
    seen.add(key); return Object.freeze({ collection: scope.collection, itemId: scope.itemId });
  }));
}
function own<T,>(record: Readonly<Record<string, T>> | undefined, key: string): T | undefined {
  return record && Object.hasOwn(record, key) ? record[key] : undefined;
}

/** One original collection. Grid dimensions are host resolutions, never inferred
 * from visible records; off-page selected scoped identities remain intact. */
export const InviteCategory = forwardRef<HTMLElement, InviteCategoryProps>(function InviteCategory({
  data, width, visible, selected, defaultSelected = [], capabilities, crossPlatformEnabled, labels,
  scale = 2, disabled = false, readOnly = false, fontMode = 'auto', hidden = false,
  rowRefs, selectionRefs, profileRefs, paginationRef, onSelectedChange, onAction, className = '', style, ...native
}, forwardedRef) {
  inviteCollection(data?.collection); inviteDimension(width, 'InviteCategory width'); inviteScale(scale);
  for (const [name, flag] of Object.entries({ visible, disabled, readOnly, hidden, crossPlatformEnabled })) inviteFlag(flag, name);
  inviteFlag(capabilities?.usePagination, 'usePagination'); inviteText(data.ttsSectionHeader, 'ttsSectionHeader');
  const columns = data.grid?.columns, rows = data.grid?.rows;
  if (!Number.isSafeInteger(columns) || columns < 0 || !Number.isSafeInteger(rows) || rows < 0
    || !Number.isSafeInteger(columns * rows))
    throw new RangeError('Invite grid requires explicit nonnegative integer dimensions.');
  if (!Array.isArray(data.people) || data.people.length > columns * rows) throw new RangeError('Invite people must fit the resolved grid capacity.');
  const ids = new Set<string>();
  data.people.forEach((person, collectionIndex) => {
    invitePerson(person, { collection: data.collection, itemId: person.id, collectionIndex });
    if (ids.has(person.id)) throw new TypeError('Invite item ids must be unique inside a category.');
    ids.add(person.id);
  });
  const cellWidth = columns ? width / columns : width;
  if (columns && cellWidth <= 7) throw new RangeError('Invite grid cells must leave positive width after the source 7px inset.');
  const rowHeight = data.collection.includes('linked_account') ? 56 : 30;
  if (!Number.isFinite(width * scale) || !Number.isFinite(rows * rowHeight * scale)) throw new RangeError('Invite grid physical geometry must be finite.');
  const [localSelected, setLocalSelected] = useState(() => selectionCopy(defaultSelected));
  const initialSelected = useRef(localSelected);
  const activeSelected = selected === undefined ? localSelected : selectionCopy(selected);
  const current = useRef({ data, visible, disabled, readOnly, hidden, activeSelected, selected, onSelectedChange, onAction });
  current.current = { data, visible, disabled, readOnly, hidden, activeSelected, selected, onSelectedChange, onAction };
  const [root, attach] = useClassicNodeRef(forwardedRef);
  useClassicLayoutEffect(() => {
    const node = root.current, form = node?.closest('form');
    if (!node || !form) return;
    const reset = (event: Event) => scheduleClassicTask(node, () => {
      if (event.defaultPrevented || root.current !== node || !node.isConnected || current.current.selected !== undefined) return;
      const next = selectionCopy(initialSelected.current);
      current.current.activeSelected = next;
      setLocalSelected(next);
    });
    form.addEventListener('reset', reset);
    return () => form.removeEventListener('reset', reset);
  });
  const canRelay = (detail: { collection: string; itemId?: string; collectionIndex?: number }) => {
    const now = current.current;
    if (!root.current || inviteBlocked(root.current) || !now.visible || now.hidden || now.disabled || now.readOnly || detail.collection !== now.data.collection) return false;
    return detail.itemId === undefined || now.data.people[detail.collectionIndex ?? -1]?.id === detail.itemId;
  };
  const change = (detail: InviteSelectionDetail) => {
    // PersonRow already completed its owner task and native-veto checkpoint.
    if (!canRelay(detail)) return;
    const now = current.current, key = inviteScopeKey(detail);
    const next = now.activeSelected.filter(scope => inviteScopeKey(scope) !== key);
    if (detail.selected) next.push(Object.freeze({ collection: detail.collection, itemId: detail.itemId }));
    if (now.selected === undefined) setLocalSelected(selectionCopy(next));
    now.onSelectedChange?.(detail);
  };
  return <section {...native} ref={attach} hidden={hidden || !visible}
    className={`mc-invite-category ${className}`} aria-label={native['aria-label'] ?? data.ttsSectionHeader}
    data-invite-collection={data.collection} data-grid-dimension-binding={`#${data.collection.replace('_friends', '_friend')}_grid_dimension`}
    data-grid-columns={columns} data-grid-rows={rows} data-row-height={rowHeight}
    style={{ ...style, width: width * scale, '--mc-invite-unit': `${scale}px` } as CSSProperties}>
    <div className="mc-invite-category__grid" style={{ width: width * scale, height: rows * rowHeight * scale }}>
      {data.people.map((person, collectionIndex) => {
        const scope = { collection: data.collection, itemId: person.id, collectionIndex };
        return <div key={inviteScopeKey(scope)} className="mc-invite-category__cell" data-collection-index={collectionIndex}
          style={{ left: ((collectionIndex % columns) * cellWidth + 3) * scale, top: Math.floor(collectionIndex / columns) * rowHeight * scale,
            width: cellWidth * scale, height: rowHeight * scale }}>
          <InvitePersonRow ref={own(rowRefs, person.id)} scope={scope} person={person} width={cellWidth}
            capabilities={capabilities} crossPlatformEnabled={crossPlatformEnabled} labels={labels} scale={scale}
            disabled={disabled} readOnly={readOnly} fontMode={fontMode} selected={activeSelected.some(item => inviteScopeKey(item) === inviteScopeKey(scope))}
            selectionRef={own(selectionRefs, person.id)} profileRef={own(profileRefs, person.id)} onSelectedChange={change}
            onAction={detail => { if ('collection' in detail && canRelay(detail)) current.current.onAction?.(detail); }}/>
        </div>;
      })}
    </div>
    <InvitePagination ref={paginationRef} collection={data.collection} width={width} included={capabilities.usePagination}
      snapshot={data.pagination} previousLabel={labels.previousPage} nextLabel={labels.nextPage}
      scale={scale} disabled={disabled} readOnly={readOnly} fontMode={fontMode}
      onAction={detail => { if ('collection' in detail && canRelay(detail)) current.current.onAction?.(detail); }}/>
    <div className="mc-invite-category__padding" aria-hidden="true"/>
  </section>;
});
