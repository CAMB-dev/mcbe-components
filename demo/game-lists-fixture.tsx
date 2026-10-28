import { useState } from 'react';
import { Button } from '../src/components';
import { PackCard, PackList, PlayerCard, ServerList, WorldList } from '../src/game-lists';
import type { PackListItem, WorldListItem } from '../src/game-lists';
import type { ReactNode } from 'react';
const worldUrl = new URL('./assets/game-lists/default_world.png', import.meta.url).href;
const packUrl = new URL('./assets/game-lists/missing_pack_icon.png', import.meta.url).href;

const worlds: WorldListItem[] = [
  { id: 'island', name: 'Island', gameMode: 'Survival', date: '10/29/26', fileSize: '12 MB', thumbnail: { src: worldUrl, sourceSize: [128,128] } },
  { id: 'locked', name: 'Locked world', disabled: true },
  { id: 'workshop', name: 'Workshop', gameMode: 'Creative', date: '10/28/26', fileSize: '4 MB' },
];
const servers = [{ id: 'friends', name: 'Friends', description: 'play.example.org', playerCount: '2/8', status: 'online' as const },
  { id: 'locked', name: 'Locked server', disabled: true }, { id: 'creative', name: 'Creative', description: 'Host-provided state', status: 'offline' as const }];
const initialPacks: PackListItem[] = [
  { id: 'terrain', name: 'Terrain', description: 'Original missing-pack image with sample data.', active: true, fileSize: '1 MB', thumbnail: { src: packUrl, sourceSize: [64,64] } },
  { id: 'sound', name: 'Sound', description: 'Second active pack', active: true },
  { id: 'locked', name: 'Locked pack', disabled: true },
  { id: 'extra', name: 'Extra', description: 'Available pack', active: false },
];
function Sample({ name, children }: { name: string; children: ReactNode }) {
  return <section className="calibration-case" style={{ gridColumn: '1 / -1', minWidth: 0 }}><h2>{name}</h2>
    <div data-case={name} style={{ background: '#28292a', padding: 12, width: 580, maxWidth: '100%', boxSizing: 'border-box' }}>{children}</div></section>;
}
export function GameListsFixture() {
  const [intent, setIntent] = useState(''), [selection, setSelection] = useState(''), [controlled, setControlled] = useState('');
  const [packs, setPacks] = useState(initialPacks), [order, setOrder] = useState(''), [packIntent, setPackIntent] = useState('');
  const [dynamic, setDynamic] = useState(worlds), [profile, setProfile] = useState('');
  return <div id="game-lists-fixture" style={{ display: 'grid', gap: 20, minWidth: 0 }}>
    <Sample name="game-worlds"><WorldList label="Fixture worlds" worlds={worlds} onValueChange={setSelection}
      onPlay={world => setIntent(`play:${world.id}`)} onEdit={world => setIntent(`edit:${world.id}`)} onDelete={world => setIntent(`delete:${world.id}`)}/>
      <output aria-label="Game list selection">{selection}</output><output aria-label="Game list action">{intent}</output></Sample>
    <Sample name="game-worlds-controlled"><WorldList label="Controlled worlds" worlds={worlds} value="island" onValueChange={setControlled}/><output aria-label="Controlled world intent">{controlled}</output></Sample>
    <Sample name="game-worlds-disabled"><WorldList label="Disabled worlds" worlds={worlds} disabled onPlay={() => setIntent('disabled-play')} onEdit={() => setIntent('disabled-edit')} onDelete={() => setIntent('disabled-delete')}/></Sample>
    <Sample name="game-worlds-dynamic"><WorldList label="Dynamic worlds" worlds={dynamic}/><Button onClick={() => setDynamic(current => current.filter(world => world.id !== 'island'))}>Remove first world</Button></Sample>
    <Sample name="game-worlds-empty"><WorldList label="Empty worlds" worlds={[]} emptyMessage="Create a world to begin"/></Sample>
    <Sample name="game-worlds-overflow"><WorldList label="Many worlds" maxHeight={87} worlds={Array.from({ length: 15 }, (_, i) => ({ id: `world-${i}`, name: `World ${i}` }))}/></Sample>
    <Sample name="game-servers"><ServerList label="Fixture servers" servers={servers} onValueChange={setSelection} onConnect={server => setIntent(`connect:${server.id}`)} onEdit={server => setIntent(`server-edit:${server.id}`)} onDelete={server => setIntent(`server-delete:${server.id}`)}/></Sample>
    <Sample name="game-servers-controlled"><ServerList label="Controlled servers" servers={servers} value="friends" onValueChange={setControlled}/></Sample>
    <Sample name="game-player"><PlayerCard name="Alex" avatar={{ src: packUrl, sourceSize: [64,64], alt: 'Fixture avatar' }} platform="PC" onProfile={() => setProfile('profile')} onPermissions={() => setProfile('permissions')}/><output aria-label="Player action">{profile}</output></Sample>
    <Sample name="game-player-renderer"><PlayerCard name="Caller skin" renderSkin={() => <span data-skin-renderer>Skin slot</span>} disabled onProfile={() => setProfile('disabled-profile')} onPermissions={() => setProfile('disabled-permissions')}/></Sample>
    <Sample name="game-packs"><PackList label="Fixture packs" packs={packs} onValueChange={setSelection}
      onActiveChange={(pack, active) => { setPackIntent(`${pack.id}:${active}`); setPacks(current => current.map(item => item.id === pack.id ? { ...item, active } : item)); }}
      onReorder={ids => { setOrder(ids.join(',')); setPacks(current => ids.map(id => current.find(item => item.id === id)!)); }}/>
      <output aria-label="Pack action">{packIntent}</output><output aria-label="Pack order">{order}</output></Sample>
    <Sample name="game-packs-controlled"><PackList label="Controlled packs" packs={initialPacks} value="terrain" onValueChange={setControlled} onActiveChange={pack => setPackIntent(`controlled:${pack.id}`)}/></Sample>
    <Sample name="game-pack-standalone"><PackCard pack={initialPacks[0]!} selected onSelect={() => setPackIntent('standalone-select')} onActiveChange={() => setPackIntent('standalone-active')}/></Sample>
    <Sample name="game-scale-one"><WorldList label="Scale one worlds" worlds={worlds.slice(0,1)} scale={1}/><ServerList label="Scale one servers" servers={servers.slice(0,1)} scale={1}/><PlayerCard name="Scale one player" scale={1}/><PackCard pack={initialPacks[0]!} scale={1}/></Sample>
  </div>;
}
