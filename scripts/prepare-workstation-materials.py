"""Copy original merged-release demo PNGs and audit installed vanilla overlays.

python scripts/prepare-workstation-materials.py [GAME_CONTENT] [--reference FULL_ZIP]

Requires Python standard library only. Reads the installed game without changing
it. Rebuilds all demo material PNGs and docs/item-materials.json reproducibly.
An installed matching entry proves presence, not activation of a runtime pack.
"""
from pathlib import Path
import argparse
import hashlib
import json
import struct
import xml.etree.ElementTree as ET
import zipfile
import zlib

ROOT = Path(__file__).resolve().parent.parent
RELEASE = 'v1.26.60.5'
RELEASE_COMMIT = '15701fa9c13923f12662984c32c124327e40e3d3'
ZIP_NAME = 'bedrock-samples-v1.26.60.5-full.zip'
ZIP_SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'
MATERIALS = [
    ('sword', 'items/diamond_sword.png'),
    ('diamond', 'items/diamond.png'),
    ('apple', 'items/apple.png'),
    ('gem', 'items/emerald.png'),
    ('lapis', 'items/dye_powder_blue.png'),
    ('coal', 'items/coal.png'),
    ('stick', 'items/stick.png'),
    ('rawBeef', 'items/beef_raw.png'),
    ('steak', 'items/beef_cooked.png'),
    ('ironSword', 'items/iron_sword.png'),
    ('ironNugget', 'items/iron_nugget.png'),
    ('grass', 'ui/icon_recipe_nature.png'),
    ('waterBottle', 'items/potion_bottle_drinkable.png'),
    ('glassBottle', 'items/potion_bottle_empty.png'),
    ('blazePowder', 'items/blaze_powder.png'),
    ('netherWart', 'items/nether_wart.png'),
    ('netheriteUpgradeTemplate', 'items/netherite_upgrade_smithing_template.png'),
    ('netheriteIngot', 'items/netherite_ingot.png'),
    ('netheriteSword', 'items/netherite_sword.png'),
    ('emptyMap', 'items/map_empty.png'),
    ('filledMap', 'items/map_filled.png'),
    ('paper', 'items/paper.png'),
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def png_size(data):
    assert data.startswith(b'\x89PNG\r\n\x1a\n'), 'Expected original PNG'
    return list(struct.unpack_from('>II', data, 16))


def archive_entries(data, wanted):
    assert len(data) >= 16, 'Invalid brarchive header'
    count, version = struct.unpack_from('<II', data, 8)
    assert version == 1 and count < 100000, 'Unsupported brarchive table'
    base = 16 + count * 256
    assert base <= len(data), 'Truncated brarchive table'
    for index in range(count):
        record = data[16 + index * 256:16 + (index + 1) * 256]
        length = record[0]
        assert 0 < length < 248, 'Invalid entry name'
        name = record[1:1 + length].decode('utf-8')
        if name not in wanted:
            continue
        offset, size = struct.unpack_from('<II', record, 248)
        assert base + offset + size <= len(data), 'Truncated brarchive payload'
        yield name, data[base + offset:base + offset + size]


def png_pixels(data):
    """Decode the original sword PNGs for a reproducible pixel-delta count.

    Supports noninterlaced8-bit RGB/RGBA and1/2/4/8-bit indexed PNGs. Does not
    modify or re-encode any asset. Merged sword is indexed4-bit, base is RGBA8.
    """
    width, height, depth, color, _, _, interlace = struct.unpack_from('>IIBBBBB', data, 16)
    assert interlace == 0 and (color == 3 or (color in (2, 6) and depth == 8))
    channels = {2: 3, 3: 1, 6: 4}[color]
    stride = (width * channels * depth + 7) // 8
    bpp = max(1, (channels * depth + 7) // 8)
    compressed, palette, transparency = bytearray(), [], b''
    offset = 8
    while offset < len(data):
        length = struct.unpack_from('>I', data, offset)[0]
        kind, payload = data[offset + 4:offset + 8], data[offset + 8:offset + 8 + length]
        if kind == b'IDAT':
            compressed.extend(payload)
        elif kind == b'PLTE':
            palette = [tuple(payload[i:i + 3]) for i in range(0, length, 3)]
        elif kind == b'tRNS':
            transparency = payload
        offset += 12 + length
    raw = zlib.decompress(compressed)
    previous, pixels = bytearray(stride), []
    for row in range(height):
        start = row * (stride + 1)
        method, scan = raw[start], bytearray(raw[start + 1:start + 1 + stride])
        for x in range(stride):
            left, up = scan[x - bpp] if x >= bpp else 0, previous[x]
            corner = previous[x - bpp] if x >= bpp else 0
            if method == 1:
                scan[x] = (scan[x] + left) & 255
            elif method == 2:
                scan[x] = (scan[x] + up) & 255
            elif method == 3:
                scan[x] = (scan[x] + (left + up) // 2) & 255
            elif method == 4:
                p = left + up - corner
                distances = [abs(p - left), abs(p - up), abs(p - corner)]
                predictor = [left, up, corner][distances.index(min(distances))]
                scan[x] = (scan[x] + predictor) & 255
            else:
                assert method == 0, 'Unknown PNG filter'
        for x in range(width):
            if color == 3:
                bit = x * depth
                index = (scan[bit // 8] >> (8 - depth - bit % 8)) & ((1 << depth) - 1)
                pixels.append((*palette[index], transparency[index] if index < len(transparency) else 255))
            else:
                pixel = tuple(scan[x * channels:(x + 1) * channels])
                pixels.append(pixel if color == 6 else (*pixel, 255))
        previous = scan
    return pixels


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('game', nargs='?', default='C:/XboxGames/Minecraft for Windows/Content')
    parser.add_argument('--reference', type=Path, default=ROOT / '.cache/references' / ZIP_NAME)
    args = parser.parse_args()
    game = Path(args.game).resolve(strict=True)
    reference = args.reference.resolve(strict=True)
    assert sha(reference.read_bytes()) == ZIP_SHA, 'Unexpected merged-release archive SHA256'
    packs_root = game / 'data/resource_packs'
    packs = sorted(pack for pack in packs_root.glob('vanilla*') if pack.is_dir())
    candidates = {path: [] for _, path in MATERIALS}
    pack_manifests = []
    for pack in packs:
        manifest_path = pack / 'manifest.json'
        manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
        pack_manifests.append({
            'pack': pack.name,
            'manifestSha256': sha(manifest_path.read_bytes()) if manifest_path.exists() else None,
            'manifestVersion': manifest.get('header', {}).get('version'),
            'capabilities': manifest.get('capabilities', []),
        })
        for folder in ('items', 'ui'):
            requested = {Path(path).name: path for _, path in MATERIALS if path.startswith(folder + '/')}
            archive = pack / '__brarchive/textures' / (folder + '.brarchive')
            if archive.exists():
                data = archive.read_bytes()
                for name, payload in archive_entries(data, requested):
                    candidates[requested[name]].append({
                        'pack': pack.name, 'path': archive.relative_to(game).as_posix(),
                        'entry': name, 'archiveSha256': sha(data), '_bytes': payload,
                        'sha256': sha(payload), 'bytes': len(payload), 'size': png_size(payload),
                    })
            for filename, relative in requested.items():
                loose = pack / 'textures' / relative
                if loose.exists():
                    payload = loose.read_bytes()
                    candidates[relative].append({
                        'pack': pack.name, 'path': loose.relative_to(game).as_posix(),
                        'entry': filename, '_bytes': payload, 'sha256': sha(payload),
                        'bytes': len(payload), 'size': png_size(payload),
                    })
    old = json.loads((ROOT / 'docs/item-materials.json').read_text(encoding='utf-8'))
    assets, images, sword_delta = [], {}, None
    with zipfile.ZipFile(reference) as samples:
        for key, relative in MATERIALS:
            source = 'resource_pack/textures/' + relative
            image = samples.read(source)
            native = candidates[relative]
            for candidate in native:
                candidate['matchesSelectedMergedBytes'] = candidate['_bytes'] == image
            assert any(candidate['matchesSelectedMergedBytes'] for candidate in native), \
                'No installed matching resource found for ' + source
            if key == 'sword':
                base = next(candidate for candidate in native if candidate['pack'] == 'vanilla')
                assert png_size(base['_bytes']) == png_size(image)
                sword_delta = sum(a != b for a, b in zip(png_pixels(base['_bytes']), png_pixels(image)))
            images[Path(relative).name] = image
            use = 'Unmodified item texture; no generated recolor, tint or fallback artwork'
            if key == 'grass':
                use = 'Already-rendered17x17 GUI category grass icon, not a generic block renderer'
            elif key == 'waterBottle':
                use = 'Original default drinkable-bottle PNG; item_texture.json potion_bottle_drinkable textures[0]. No recoloring or synthesized potion overlay.'
            elif key in ('emptyMap', 'filledMap'):
                use = 'Original empty/filled map item icon. This PNG does not render world-specific map data.'
            assets.append({
                'key': key, 'file': 'demo/assets/minecraft/' + Path(relative).name,
                'source': source, 'sha256': sha(image), 'size': png_size(image), 'bytes': len(image),
                'origin': 'official-merged-release', 'release': RELEASE, 'modifications': 'None',
                'matchesAtLeastOneInstalledCandidate': True,
                'nativeCandidates': [{k: v for k, v in item.items() if k != '_bytes'} for item in native],
                'use': use,
            })
    app_manifest = ET.parse(game / 'AppxManifest.xml').getroot()
    identity = next(element for element in app_manifest if element.tag.endswith('Identity'))
    base_sword = next(item for item in candidates['items/diamond_sword.png'] if item['pack'] == 'vanilla')
    output = {
        'schemaVersion': 2, 'referenceRepository': 'https://github.com/Mojang/bedrock-samples',
        'referenceCommit': RELEASE_COMMIT, 'referenceRelease': RELEASE,
        'archiveUrl': 'https://github.com/Mojang/bedrock-samples/releases/download/' + RELEASE + '/' + ZIP_NAME,
        'archiveSha256': ZIP_SHA,
        'upstreamLicense': 'https://github.com/Mojang/bedrock-samples/blob/' + RELEASE_COMMIT + '/LICENSE.md',
        'installedGameVersion': identity.attrib['Version'],
        'distribution': 'Demo-only game assets, not npm library assets. Upstream rights apply separately from this project MIT license.',
        'selectionBasis': 'Select official v1.26.60.5 full merged-release PNGs. Every selected byte sequence is also present in an installed vanilla or version-overlay candidate. No runtime pack activation or precedence is inferred from folder names, manifests or file presence.',
        'reproduce': 'python scripts/prepare-workstation-materials.py [GAME_CONTENT] [--reference FULL_ZIP]',
        'audit': {
            'scope': 'All installed resource_packs/vanilla* directories, exact requested paths in loose files and __brarchive/textures/items.brarchive or ui.brarchive. Candidate order is lexical directory order, not runtime precedence.',
            'scannedPackCount': len(packs), 'packManifests': pack_manifests,
            'runtimePackStackProven': False,
            'caveat': 'In particular vanilla_1.21.90 advertises capability pbr. This audit does not prove whether PBR or any version overlay is active in a running session. Platform packs, user packs and native renderer changes may alter actual runtime output.',
        },
        'assets': assets,
        'historicalSwordCorrection': {
            'earlierClaimWithdrawn': 'The earlier conclusion that the installed game sword differs from public samples by22 pixels treated only the vanilla base entry as current runtime authority and overlooked version overlays.',
            'baseEntry': {'pack': 'vanilla', 'sha256': base_sword['sha256'], 'bytes': base_sword['bytes']},
            'selectedMergedEntry': {'release': RELEASE, 'sha256': sha(images['diamond_sword.png']), 'bytes': len(images['diamond_sword.png'])},
            'baseVsMergedChangedRgbaPixels': sword_delta,
            'matchingNativePacks': [item['pack'] for item in candidates['items/diamond_sword.png'] if item['matchesSelectedMergedBytes']],
            'correctInterpretation': 'The22-pixel delta is base-entry versus official merged-release PNG. Installed version overlays include matching merged bytes; this is not evidence of a current-runtime-versus-sample discrepancy.',
        },
        'rendering': old['rendering'], 'inventoryAudit': old['inventoryAudit'],
    }
    destination = ROOT / 'demo/assets/minecraft'
    destination.mkdir(parents=True, exist_ok=True)
    for filename, image in images.items():
        (destination / filename).write_bytes(image)
    (ROOT / 'docs/item-materials.json').write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8')
    print('Prepared', len(assets), 'unmodified merged-release PNGs; scanned', len(packs), 'installed vanilla directories.')
    print('Sword base-vs-merged changed RGBA pixels:', sword_delta)
    for asset in assets:
        matched = [item['pack'] for item in asset['nativeCandidates'] if item['matchesSelectedMergedBytes']]
        changed = [item['pack'] for item in asset['nativeCandidates'] if not item['matchesSelectedMergedBytes']]
        print(asset['key'] + ': matching=' + ','.join(matched) + '; different=' + ','.join(changed))


if __name__ == '__main__':
    main()
