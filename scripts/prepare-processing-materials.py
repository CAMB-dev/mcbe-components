"""Copy unmodified demo item textures and record their original provenance.

Reads the user's installed game and compares against the official full sample
already cached for fidelity research. Does not change the game installation.
"""
from pathlib import Path
import hashlib
import json
import struct
import sys
import zipfile

root = Path(__file__).resolve().parent.parent
game = Path(sys.argv[1] if len(sys.argv) > 1 else 'C:/XboxGames/Minecraft for Windows/Content')
archive = game / 'data/resource_packs/vanilla/__brarchive/textures/items.brarchive'
data = archive.read_bytes()
count = struct.unpack_from('<I', data, 8)[0]
payload = 16 + count * 256
wanted = {'coal.png', 'stick.png', 'beef_raw.png', 'beef_cooked.png', 'iron_sword.png', 'iron_nugget.png'}
reference = root / '.cache/references/bedrock-samples-v1.26.60.5-full.zip'
manifest_path = root / 'docs/item-materials.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
found = []
with zipfile.ZipFile(reference) as samples:
    for index in range(count):
        record = data[16 + index * 256:16 + (index + 1) * 256]
        name = record[1:1 + record[0]].decode()
        if name not in wanted:
            continue
        offset, size = struct.unpack_from('<II', record, 248)
        image = data[payload + offset:payload + offset + size]
        assert image.startswith(b'\x89PNG\r\n\x1a\n'), name
        source = 'resource_pack/textures/items/' + name
        sample = samples.read(source)
        relative = 'demo/assets/minecraft/' + name
        (root / relative).write_bytes(image)
        entry = {
            'file': relative, 'source': source,
            'sha256': hashlib.sha256(image).hexdigest(),
            'size': list(struct.unpack_from('>II', image, 16)), 'bytes': len(image),
            'localArchive': 'textures/items.brarchive',
            'localArchiveSha256': hashlib.sha256(data).hexdigest(),
            'matchesInstalledGameBytes': True,
            'use': 'Processing and crafting demonstration item texture',
            'modifications': 'None', 'origin': 'installed-game',
            'upstreamReference': {
                'release': 'v1.26.60.5-full', 'sha256': hashlib.sha256(sample).hexdigest(),
                'matchesInstalledGameBytes': sample == image,
            },
        }
        manifest['assets'] = [item for item in manifest['assets'] if item['file'] != relative]
        manifest['assets'].append(entry)
        found.append(name)
assert set(found) == wanted, wanted - set(found)
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print('Prepared unmodified demo textures:', ', '.join(sorted(found)))
