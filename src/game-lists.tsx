import { forwardRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import { Button } from './components';
import { Image } from './image';
import type { ImageSize } from './image';
import { ScrollArea } from './scroll-area';

export interface GameListImage { src: string; sourceSize: ImageSize; alt?: string }
interface ListEntry { id: string; name: string; disabled?: boolean }
interface ListProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'defaultValue' | 'onChange' | 'onSelect' | 'onPlay'> {
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  disabled?: boolean;
  /** Positive integer GUI scale; source dimensions are logical game pixels. */
  scale?: number;
  /** Maximum list viewport height in logical game pixels. */
  maxHeight?: number;
  emptyMessage?: ReactNode;
}
export interface WorldListItem extends ListEntry {
  thumbnail?: GameListImage;
  gameMode?: string;
  /** Already localized/formatted by the caller. */
  date?: string;
  fileSize?: string;
}
export interface WorldListProps extends ListProps {
  worlds: readonly WorldListItem[];
  onPlay?: (world: WorldListItem) => void;
  onEdit?: (world: WorldListItem) => void;
  /** Host decides whether to confirm/delete; this component emits intent only. */
  onDelete?: (world: WorldListItem) => void;
}
export interface ServerListItem extends ListEntry {
  description?: string;
  playerCount?: string;
  status?: 'online' | 'offline' | 'unavailable';
  /** Optional accessible status; defaults to the supplied status value. */
  statusLabel?: string;
}
export interface ServerListProps extends ListProps {
  servers: readonly ServerListItem[];
  onConnect?: (server: ServerListItem) => void;
  onEdit?: (server: ServerListItem) => void;
  onDelete?: (server: ServerListItem) => void;
}
export interface PackListItem extends ListEntry {
  thumbnail?: GameListImage;
  description?: string;
  fileSize?: string;
  active?: boolean;
}
export interface PackCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onSelect'> {
  pack: PackListItem;
  selected?: boolean;
  onSelect?: () => void;
  onActiveChange?: (active: boolean) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  disabled?: boolean;
  scale?: number;
  activateLabel?: string;
  deactivateLabel?: string;
  moveUpLabel?: string;
  moveDownLabel?: string;
}
export interface PackListProps extends ListProps {
  packs: readonly PackListItem[];
  onActiveChange?: (pack: PackListItem, active: boolean) => void;
  /** New complete ID order; the caller commits the reordered data. */
  onReorder?: (ids: string[], moved: PackListItem) => void;
}
export interface PlayerCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onSelect'> {
  name: string;
  avatar?: GameListImage;
  /** Caller-owned renderer; the library does not implement the native 3D paper doll. */
  renderSkin?: () => ReactNode;
  platform?: ReactNode;
  permissionIcon?: GameListImage;
  onProfile?: () => void;
  onPermissions?: () => void;
  profileLabel?: string;
  permissionsLabel?: string;
  disabled?: boolean;
  scale?: number;
}

const cx = (...values: (string | undefined | false)[]) => values.filter(Boolean).join(' ');
function scaledStyle(scale: number, style?: CSSProperties): CSSProperties {
  if (!Number.isSafeInteger(scale) || scale < 1) throw new RangeError('scale must be a positive integer.');
  return { '--mc-list-scale': scale, ...style } as CSSProperties;
}
function useList(items: readonly ListEntry[], value: string | undefined, defaultValue: string | undefined, onChange: ListProps['onValueChange'], disabled?: boolean) {
  const enabled = items.filter(item => !disabled && !item.disabled);
  const [internal, setInternal] = useState(defaultValue ?? enabled[0]?.id ?? '');
  const selected = value ?? (items.some(item => item.id === internal) ? internal : enabled[0]?.id ?? '');
  const [focused, setFocused] = useState(selected);
  const tabStop = enabled.some(item => item.id === focused) ? focused : enabled.some(item => item.id === selected) ? selected : enabled[0]?.id;
  return {
    selected, tabStop, setFocused,
    choose(id: string) { if (disabled || !enabled.some(item => item.id === id)) return; if (value === undefined) setInternal(id); onChange?.(id); },
    keyDown(event: KeyboardEvent<HTMLDivElement>) {
      if (event.defaultPrevented || event.nativeEvent.isComposing || disabled || !(event.target instanceof HTMLElement) || !event.target.matches('[data-list-primary]')) return;
      const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
      if (!keys.includes(event.key) || !enabled.length) return;
      event.preventDefault();
      const currentId = event.target.getAttribute('data-list-primary');
      const index = enabled.findIndex(item => item.id === currentId);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length;
      const item = enabled[next]; if (!item) return;
      const id = item.id;
      setFocused(id);
      const button = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-list-primary]')).find(node => node.dataset.listPrimary === id);
      button?.focus();
    },
  };
}
function Thumbnail({ image, className, size, scale }: { image?: GameListImage; className: string; size: ImageSize; scale: number }) {
  return <span className={className} aria-hidden={!image || !image.alt ? true : undefined}>
    {image && <Image src={image.src} sourceSize={image.sourceSize} size={size} scale={scale} alt={image.alt ?? ''}/>}
  </span>;
}
function Glyph({ name }: { name: string }) { return <span aria-hidden="true" className={`mc-game-list__glyph mc-game-list__glyph--${name}`}/>; }

/** Classic local-world rows. Activation reports play intent; arrow keys move focus only. */
export const WorldList = forwardRef<HTMLDivElement, WorldListProps>(function WorldList({
  worlds, label, value, defaultValue, onValueChange, onPlay, onEdit, onDelete, disabled, scale = 2,
  maxHeight = 290, emptyMessage = 'No worlds', className, style, onKeyDown, ...props
}, ref) {
  const list = useList(worlds, value, defaultValue, onValueChange, disabled);
  return <div {...props} ref={ref} role="group" aria-label={label} className={cx('mc-game-list', 'mc-world-list', className)}
    style={scaledStyle(scale, style)} onKeyDown={event => { onKeyDown?.(event); list.keyDown(event); }}>
    <ScrollArea label={`${label} scroll area`} scale={scale} style={{ maxHeight: maxHeight * scale }}>
      <ul className="mc-game-list__items">{worlds.map(world => <li key={world.id} className="mc-world-list__row" data-selected={list.selected === world.id || undefined}>
        <Button className="mc-game-list__surface mc-world-list__primary" disabled={disabled || world.disabled}
          data-list-primary={world.id} tabIndex={list.tabStop === world.id ? 0 : -1} aria-pressed={list.selected === world.id}
          onFocus={() => list.setFocused(world.id)} onClick={() => { list.choose(world.id); onPlay?.(world); }}>
          <Thumbnail image={world.thumbnail} className="mc-world-list__thumbnail" size={[38.2602,22]} scale={scale}/>
          <span className="mc-world-list__text"><span className="mc-game-list__line"><span>{world.name}</span><span className="mc-game-list__secondary">{world.date}</span></span>
            <span className="mc-game-list__line mc-game-list__secondary"><span>{world.gameMode}</span><span>{world.fileSize}</span></span></span>
        </Button>
        {onEdit && <Button className="mc-game-list__surface mc-game-list__action" aria-label={`Edit ${world.name}`} disabled={disabled || world.disabled} onClick={() => onEdit(world)}><Glyph name="edit"/></Button>}
        {onDelete && <Button className="mc-game-list__surface mc-game-list__action" aria-label={`Delete ${world.name}`} disabled={disabled || world.disabled} onClick={() => onDelete(world)}><Glyph name="trash"/></Button>}
      </li>)}</ul>
      {!worlds.length && <div className="mc-game-list__empty">{emptyMessage}</div>}
    </ScrollArea>
  </div>;
});

/** Classic external/network-world rows; all status and connection behavior is host supplied. */
export const ServerList = forwardRef<HTMLDivElement, ServerListProps>(function ServerList({
  servers, label, value, defaultValue, onValueChange, onConnect, onEdit, onDelete, disabled, scale = 2,
  maxHeight = 300, emptyMessage = 'No servers', className, style, onKeyDown, ...props
}, ref) {
  const list = useList(servers, value, defaultValue, onValueChange, disabled);
  return <div {...props} ref={ref} role="group" aria-label={label} className={cx('mc-game-list', 'mc-server-list', className)}
    style={scaledStyle(scale, style)} onKeyDown={event => { onKeyDown?.(event); list.keyDown(event); }}>
    <ScrollArea label={`${label} scroll area`} scale={scale} style={{ maxHeight: maxHeight * scale }}>
      <ul className="mc-game-list__items">{servers.map(server => <li key={server.id} className="mc-server-list__row" data-selected={list.selected === server.id || undefined}>
        <Button className="mc-game-list__surface mc-server-list__primary" disabled={disabled || server.disabled}
          data-list-primary={server.id} tabIndex={list.tabStop === server.id ? 0 : -1} aria-pressed={list.selected === server.id}
          onFocus={() => list.setFocused(server.id)} onClick={() => { list.choose(server.id); onConnect?.(server); }}>
          <span className="mc-server-list__text"><span>{server.name}</span><span className="mc-game-list__secondary">{server.description}</span></span>
          <span className="mc-server-list__status"><span>{server.playerCount}</span>{server.status && <span role="img" aria-label={server.statusLabel ?? server.status}
            className={`mc-game-list__glyph mc-game-list__glyph--${server.status === 'online' ? 'online' : 'offline'}`}/>}</span>
        </Button>
        {onEdit && <Button className="mc-game-list__surface mc-game-list__action" aria-label={`Edit ${server.name}`} disabled={disabled || server.disabled} onClick={() => onEdit(server)}><Glyph name="edit"/></Button>}
        {onDelete && <Button className="mc-game-list__surface mc-game-list__action" aria-label={`Delete ${server.name}`} disabled={disabled || server.disabled} onClick={() => onDelete(server)}><Glyph name="trash"/></Button>}
      </li>)}</ul>
      {!servers.length && <div className="mc-game-list__empty">{emptyMessage}</div>}
    </ScrollArea>
  </div>;
});

/** Compact pause-player row, with a caller-provided avatar or renderer slot. */
export const PlayerCard = forwardRef<HTMLDivElement, PlayerCardProps>(function PlayerCard({
  name, avatar, renderSkin, platform, permissionIcon, onProfile, onPermissions, profileLabel,
  permissionsLabel = `Permissions for ${name}`, disabled, scale = 2, className, style, ...props
}, ref) {
  return <div {...props} ref={ref} className={cx('mc-game-list', 'mc-player-card', className)} style={scaledStyle(scale, style)}>
    <Button className="mc-game-list__surface mc-player-card__primary" aria-label={profileLabel} disabled={disabled} onClick={onProfile}>
      <span className="mc-player-card__portrait">{renderSkin ? renderSkin() : avatar && <Image src={avatar.src} sourceSize={avatar.sourceSize} alt={avatar.alt ?? ''} size={[18,18]} scale={scale}/>}</span>
      <span className="mc-player-card__name">{name}</span>{platform && <span className="mc-player-card__platform">{platform}</span>}
    </Button>
    {onPermissions && <Button className="mc-game-list__surface mc-player-card__permission" aria-label={permissionsLabel} disabled={disabled} onClick={onPermissions}>
      {permissionIcon ? <Image src={permissionIcon.src} sourceSize={permissionIcon.sourceSize} size={[15,15]} scale={scale} alt={permissionIcon.alt ?? ''}/> : <Glyph name="permissions"/>}
    </Button>}
  </div>;
});

/** Source pack icon/text geometry; active state and actions remain caller-owned. */
export const PackCard = forwardRef<HTMLDivElement, PackCardProps>(function PackCard({
  pack, selected = false, onSelect, onActiveChange, onMoveUp, onMoveDown, canMoveUp = true, canMoveDown = true,
  disabled, scale = 2, activateLabel = `Activate ${pack.name}`, deactivateLabel = `Deactivate ${pack.name}`,
  moveUpLabel = `Move ${pack.name} up`, moveDownLabel = `Move ${pack.name} down`, className, style, tabIndex, ...props
}, ref) {
  const locked = disabled || pack.disabled;
  return <div {...props} ref={ref} className={cx('mc-game-list', 'mc-pack-card', className)} data-selected={selected || undefined} data-active={pack.active || undefined} style={scaledStyle(scale, style)}>
    <Button className="mc-pack-card__select" aria-pressed={selected} disabled={locked} onClick={onSelect}
      data-list-primary={pack.id} tabIndex={tabIndex}>
      <Thumbnail image={pack.thumbnail} className="mc-pack-card__thumbnail" size={[42,42]} scale={scale}/>
      <span className="mc-pack-card__text"><span className="mc-game-list__line"><span>{pack.name}</span><span>{pack.fileSize}</span>
        {pack.active && <span role="img" aria-label="Active" className="mc-game-list__glyph mc-game-list__glyph--online"/>}</span>
        <span className="mc-pack-card__description">{pack.description}</span></span>
    </Button>
    {selected && (onActiveChange || onMoveUp || onMoveDown) && <div className="mc-pack-card__actions">
      {onActiveChange && <Button className="mc-pack-card__activate" disabled={locked} aria-label={pack.active ? deactivateLabel : activateLabel} onClick={() => onActiveChange(!pack.active)}>
        <Glyph name={pack.active ? 'minus' : 'plus'}/><span>{pack.active ? 'Deactivate' : 'Activate'}</span></Button>}
      {onMoveUp && <Button variant="ghost" className="mc-pack-card__move" disabled={locked || !canMoveUp} aria-label={moveUpLabel} onClick={onMoveUp}><Glyph name="up"/></Button>}
      {onMoveDown && <Button variant="ghost" className="mc-pack-card__move" disabled={locked || !canMoveDown} aria-label={moveDownLabel} onClick={onMoveDown}><Glyph name="down"/></Button>}
    </div>}
  </div>;
});

export const PackList = forwardRef<HTMLDivElement, PackListProps>(function PackList({
  packs, label, value, defaultValue, onValueChange, onActiveChange, onReorder, disabled, scale = 2,
  maxHeight = 300, emptyMessage = 'No packs', className, style, onKeyDown, ...props
}, ref) {
  const list = useList(packs, value, defaultValue, onValueChange, disabled);
  const move = (index: number, delta: number) => {
    const next = index + delta;
    const currentPack = packs[index], nextPack = packs[next];
    if (disabled || !currentPack || currentPack.disabled || !nextPack || nextPack.disabled) return;
    const ids = packs.map(pack => pack.id); ids[index] = nextPack.id; ids[next] = currentPack.id; onReorder?.(ids, currentPack);
  };
  return <div {...props} ref={ref} role="group" aria-label={label} className={cx('mc-game-list', 'mc-pack-list', className)} style={scaledStyle(scale, style)}
    onKeyDown={event => { onKeyDown?.(event); list.keyDown(event); }}>
    <ScrollArea label={`${label} scroll area`} scale={scale} style={{ maxHeight: maxHeight * scale }}>
      <ul className="mc-game-list__items">{packs.map((pack, index) => <li key={pack.id}>
        <PackCard pack={pack} selected={list.selected === pack.id} disabled={disabled} scale={scale} tabIndex={list.tabStop === pack.id ? 0 : -1}
          onFocus={event => { if ((event.target as HTMLElement).matches('[data-list-primary]')) list.setFocused(pack.id); }} onSelect={() => list.choose(pack.id)}
          onActiveChange={onActiveChange ? active => onActiveChange(pack, active) : undefined}
          onMoveUp={onReorder && pack.active ? () => move(index, -1) : undefined} onMoveDown={onReorder && pack.active ? () => move(index, 1) : undefined}
          canMoveUp={index > 0 && !packs[index - 1]?.disabled} canMoveDown={index < packs.length - 1 && !packs[index + 1]?.disabled}/>
      </li>)}</ul>
      {!packs.length && <div className="mc-game-list__empty">{emptyMessage}</div>}
    </ScrollArea>
  </div>;
});
