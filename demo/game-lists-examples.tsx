import { useState } from 'react';
import { PackCard, PackList, PlayerCard, ServerList, WorldList } from '../src/game-lists';
import type { PackListItem, WorldListItem } from '../src/game-lists';
const worldUrl = new URL('./assets/game-lists/default_world.png', import.meta.url).href;
const packUrl = new URL('./assets/game-lists/missing_pack_icon.png', import.meta.url).href;

const worldImage = { src: worldUrl, sourceSize: [128,128] as const, alt: '' };
const packImage = { src: packUrl, sourceSize: [64,64] as const, alt: '' };
const worlds: WorldListItem[] = [
  { id: 'survival', name: 'Survival island', gameMode: 'Survival', date: '10/29/26', fileSize: '12.4 MB', thumbnail: worldImage },
  { id: 'creative', name: 'Creative workshop', gameMode: 'Creative', date: '10/28/26', fileSize: '4.2 MB', thumbnail: worldImage },
];
export function GameListsExamples({ notify }: { notify?: (message: string) => void }) {
  const [packs, setPacks] = useState<PackListItem[]>([
    { id: 'terrain', name: 'Terrain pack', description: 'Sample data with the original missing-pack icon.', active: true, fileSize: '1.2 MB', thumbnail: packImage },
    { id: 'sounds', name: 'Sounds pack', description: 'Host owns activation and loading.', active: true, fileSize: '2.4 MB', thumbnail: packImage },
  ]);
  return <div style={{ display: 'grid', gap: 24, width: '100%', minWidth: 0 }}>
    <p>Classic JSON UI source profile. These callbacks report local intent. Sample thumbnails use the original default-world and missing-pack images.</p>
    <div><h3>WorldList</h3><WorldList label="Example worlds" worlds={worlds} onPlay={world => notify?.(`Play intent: ${world.name}`)} onEdit={world => notify?.(`Edit intent: ${world.name}`)} onDelete={world => notify?.(`Delete intent: ${world.name}`)}/></div>
    <div><h3>ServerList</h3><ServerList label="Example servers" servers={[
      { id: 'local', name: 'Friends server', description: 'Sample address: play.example.org', playerCount: '3/10', status: 'online' },
      { id: 'offline', name: 'Creative server', description: 'Offline status supplied by host', status: 'offline' },
    ]} onConnect={server => notify?.(`Connect intent: ${server.name}`)}/></div>
    <div><h3>PlayerCard</h3><PlayerCard name="Player" platform="PC" renderSkin={() => <span aria-label="Caller renderer slot" style={{ fontSize: 10 }}>Skin</span>} onProfile={() => notify?.('Profile intent')} onPermissions={() => notify?.('Permissions intent')}/><p>The small Skin label marks a caller renderer slot; it is not a native skin render.</p></div>
    <div><h3>PackList</h3><PackList label="Example packs" packs={packs} onActiveChange={(pack, active) => setPacks(current => current.map(item => item.id === pack.id ? { ...item, active } : item))}
      onReorder={ids => setPacks(current => ids.map(id => current.find(pack => pack.id === id)!))}/></div>
    <div><h3>PackCard</h3><PackCard pack={{ id: 'standalone', name: 'Standalone pack', description: 'A reusable source-sized card. Selection belongs to its caller.', thumbnail: packImage }} onSelect={() => notify?.('Pack selection intent')}/></div>
  </div>;
}
