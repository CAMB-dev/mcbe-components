"""Copy unmodified official block/banner texture sources and record provenance.

python scripts/prepare-item-renderers.py [GAME_CONTENT] [--reference FULL_ZIP]
No generated art or re-encoded replacement textures are written. TGA sources
stay TGA; the browser renderer decodes their original pixels at runtime.
"""
from pathlib import Path
import argparse
import hashlib
import json
import struct
import zipfile

ROOT = Path(__file__).resolve().parent.parent
COMMIT = '15701fa9c13923f12662984c32c124327e40e3d3'
RELEASE = 'v1.26.60.5'
ARCHIVE = 'bedrock-samples-v1.26.60.5-full.zip'
ARCHIVE_SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_output(path, data, check):
    if check:
        assert path.is_file() and path.read_bytes() == data, 'Generated output differs: ' + str(path)
    elif not path.exists() or path.read_bytes() != data:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)


def entries(data, wanted):
    count, version = struct.unpack_from('<II', data, 8)
    assert version == 1 and count < 100000
    base = 16 + count * 256
    assert base <= len(data)
    for index in range(count):
        record = data[16 + index * 256:16 + (index + 1) * 256]
        name = record[1:1 + record[0]].decode()
        if name not in wanted:
            continue
        offset, size = struct.unpack_from('<II', record, 248)
        assert base + offset + size <= len(data)
        yield name, data[base + offset:base + offset + size]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('game', nargs='?', default='C:/XboxGames/Minecraft for Windows/Content')
    parser.add_argument('--reference', type=Path, default=ROOT / '.cache/references' / ARCHIVE)
    parser.add_argument('--check', action='store_true', help='Verify generated files without writing them.')
    args = parser.parse_args()
    game = Path(args.game).resolve(strict=True)
    assert sha(args.reference.read_bytes()) == ARCHIVE_SHA
    output = ROOT / 'src/assets/item-renderers'
    output.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.reference) as source:
        prefix = 'resource_pack/textures/entity/banner/'
        choices = {}
        for name in source.namelist():
            filename = Path(name).name
            stem, extension = Path(filename).stem, Path(filename).suffix
            if not name.startswith(prefix) or extension not in ('.png', '.tga'):
                continue
            if not stem.startswith('banner_') or stem.endswith('_mers') or stem in ('banner_illager', 'banner_pattern_illager', 'banner_base'):
                continue
            # The merged release includes newer PNG variants alongside older
            # TGA spellings. Select an explicit PNG if present; record its bytes.
            if stem not in choices or extension == '.png':
                choices[stem] = name
        enchanting_sources = ['resource_pack/textures/blocks/enchanting_table_' + face + '.png' for face in ['top', 'side', 'bottom']]
        selected = ['resource_pack/textures/blocks/stone.png', 'resource_pack/textures/blocks/stonebrick.png', prefix + 'banner_base.tga', *[choices[key] for key in sorted(choices)], *enchanting_sources]
        native = {Path(name).name: [] for name in selected}
        packs = sorted(pack for pack in (game / 'data/resource_packs').glob('vanilla*') if pack.is_dir())
        for pack in packs:
            for relative in ['textures/blocks.brarchive', 'textures/entity/banner.brarchive']:
                archive = pack / '__brarchive' / relative
                if not archive.exists():
                    continue
                raw = archive.read_bytes()
                for filename, payload in entries(raw, native):
                    native[filename].append({'pack': pack.name, 'archive': archive.relative_to(game).as_posix(), 'entry': filename, 'sha256': sha(payload), 'bytes': len(payload)})
        assets = []
        for name in selected:
            raw, filename = source.read(name), Path(name).name
            size = list(struct.unpack_from('>II', raw, 16)) if name.endswith('.png') else list(struct.unpack_from('<HH', raw, 12))
            matches = [item for item in native[filename] if item['sha256'] == sha(raw)]
            assert matches, 'Selected source lacks a matching installed candidate: ' + name
            write_output(output / filename, raw, args.check)
            assets.append({'file': 'src/assets/item-renderers/' + filename, 'source': name, 'sha256': sha(raw), 'bytes': len(raw), 'size': size,
                           'pinnedUrl': 'https://raw.githubusercontent.com/Mojang/bedrock-samples/' + COMMIT + '/' + name,
                           'modifications': 'None; original binary bytes', 'nativeCandidates': native[filename], 'matchingNativePacks': [item['pack'] for item in matches]})
            if name in enchanting_sources:
                texture_set_source = name[:-4] + '.texture_set.json'
                if texture_set_source in source.namelist():
                    texture_set = source.read(texture_set_source)
                    assets[-1]['textureSet'] = {'source': texture_set_source, 'sha256': sha(texture_set), 'value': json.loads(texture_set.decode('utf-8-sig')),
                                               'scope': 'Color/MERS texture association only; does not define geometry, GUI sizing or camera.'}
        license_data = source.read('LICENSE.md')
        write_output(output / 'LICENSE.md', license_data, args.check)
        references = []
        for name in ['resource_pack/textures/terrain_texture.json', 'resource_pack/blocks.json', 'resource_pack/ui/loom_screen.json', 'resource_pack/materials/entity.material', prefix + 'banner.tga']:
            if name in source.namelist():
                references.append({'source': name, 'sha256': sha(source.read(name)), 'pinnedUrl': 'https://raw.githubusercontent.com/Mojang/bedrock-samples/' + COMMIT + '/' + name})
        old_path = ROOT / 'docs/item-renderers-geometry.json'
        old = json.loads(old_path.read_text()) if old_path.exists() else {}
        metadata = {
            'schemaVersion': 1, 'release': RELEASE, 'commit': COMMIT, 'archiveSha256': ARCHIVE_SHA,
            'license': {'file': 'src/assets/item-renderers/LICENSE.md', 'sha256': sha(license_data), 'source': 'LICENSE.md'},
            'assets': assets, 'referenceSources': references,
            'runtimePackActivationProven': False,
            'sourceSelection': 'Unmodified official merged-release texture files, each matching at least one installed vanilla/version-overlay entry. Presence does not prove runtime activation, especially PBR overlays.',
            'blockAliases': {'stone': 'blocks.stone -> terrain.stone[0] -> stone.png', 'stone-bricks': 'blocks.stone_bricks -> terrain.stone_bricks -> stonebrick.png', 'stone-slab': 'blocks.normal_stone_slab -> terrain.normal_stone_slab -> stone.png', 'stone-stairs': 'blocks.normal_stone_stairs -> terrain.stone[0] -> stone.png',
                             'enchanting-table': 'blocks.enchanting_table.{up,side,down} -> terrain.enchanting_table_{top,side,bottom} -> original PNGs'},
            'blockAliasWarning': 'Legacy stone_stairs names cobblestone stairs. stone_slab/smooth_stone use different smooth-stone textures. These presets explicitly mean normal stone.',
            'banner': {'atlasSize': [64, 64], 'frontUvPixels': [1, 1, 20, 40], 'patternCount': len(choices),
                       'patternOrder': 'Exported IDs are lexical source-file names, not a claimed native Loom collection order. Native #banner_patterns/#banner_colors are backend bindings.',
                       'alpha': 'Preserve full source alpha, including partial175/176 edges; never threshold to a binary mask.',
                       'sampling': 'Native entity.material banner samplerIndex0 textureFilter Point. banner_pole adds DISABLE_TINTING.',
                       'composition': 'Tint RGB multiplicatively and composite pattern layers source-over over the base cloth. This is a reconstruction pending native shader/screenshot calibration.'},
            'reconstruction': {'mesh': 'Unit-cube/slab/voxel-stair surfaces and banner cuboids reconstructed from shapes and original atlas layout; no native C++ mesh or Java model is presented as Bedrock ground truth.',
                               'camera': 'Orthographic item pose, per-face brightness and dye profiles are configurable reconstructions. Empirical native calibration and remaining residuals are recorded below; no native camera or shader recovery is claimed.',
                               'textureIdentityVsRenderer': 'Original texture hashes establish texture identity; they do not certify the complete item renderer.'},
            'calibration': old.get('calibration', {'nativeScreenshotVerified': False, 'measurements': []}),
            'enchantingTable': {
                'preset': 'enchanting-table', 'cuboid': [[0, 0, 0], [16, 12, 16]], 'referenceBounds': [[0, 0, 0], [16, 16, 16]],
                'geometryScope': 'Source/connected-face-supported cuboid reconstruction, not exported native CPU model-space coordinates or a geometry JSON.',
                'sourceEvidence': {'captureSha256': '70ad8f55bca5680dc861e40cc6237aa25369ab51684805fc5309c4d06bfa615a', 'globalDraw': 57, 'apiEvent': 197, 'commandList': 799, 'pso': 805, 'vertices': [24, 35], 'indexEntries': [36, 53],
                                   'auditSha256': '9afc1408a1124481badb1ff7a1cd18b5bb865f871cb66a105cd121a7d073f09e',
                                   'scope': 'Only the third block in draw57 is the table; preceding slab vertices are excluded. Private capture data is not distributed.'},
                'uv': {'topSourceRect': [0, 0, 16, 16], 'sideSourceRect': [0, 4, 16, 12], 'bottomSourceRect': [0, 0, 16, 16],
                       'webAxes': 'In the existing renderer axes the near top corner is(16,12,16), right is(16,12,0), back is(0,12,0), left is(0,12,16). This is a chosen Web convention, not a recovered native object-axis assignment.',
                       'top': '[16-z,x]', 'positiveXSide': '[16-z,16-y]', 'positiveZSide': '[x,16-y]',
                       'capturedTopCornerUV': {'front': [0, 16], 'right': [16, 16], 'back': [16, 0], 'left': [0, 0]},
                       'bottomOrientation': 'Full original down texture; native hidden-face orientation remains unobserved.'},
                'defaultLighting': {'top': 1, 'left': 1, 'right': 1, 'bottom': 1,
                                    'evidence': 'Actual table12 vertices have RGB255/255/255 on three visible faces. Generic slab side factors127/186 belong to different vertices and are not applied.',
                                    'scope': 'White factors are consistent with the captured visible faces; unseen face behavior is not independently certified.'},
                'camera': 'Reuses the configurable existing Web item pose. No native camera/CPU pretransform is recovered or hardcoded.',
                'textureOverrides': 'textures.all replaces all preset images; per-face keys replace only those faces. A custom model retains its existing caller-camera/lighting route.',
                'verificationScope': 'Original materials and source-supported geometry/UV only; this does not certify complete native item pixels or PBR/version-pack activation.',
            },
        }
        write_output(old_path, (json.dumps(metadata, indent=2) + '\n').encode('utf8'), args.check)
        lines = ['// Generated by scripts/prepare-item-renderers.py; original assets are unmodified.', 'export const blockTextureUrls = {',
                 "  stone: new URL('./assets/item-renderers/stone.png', import.meta.url).href,", "  'stone-bricks': new URL('./assets/item-renderers/stonebrick.png', import.meta.url).href,",
                 *["  'enchanting-table-" + face + "': new URL('./assets/item-renderers/enchanting_table_" + face + ".png', import.meta.url).href," for face in ['top', 'side', 'bottom']], '};',
                 "export const bannerBaseUrl = new URL('./assets/item-renderers/banner_base.tga', import.meta.url).href;", 'export const bannerPatternUrls = {']
        for stem in sorted(choices):
            key, filename = stem.removeprefix('banner_').replace('_', '-'), Path(choices[stem]).name
            lines.append(f"  '{key}': new URL('./assets/item-renderers/{filename}', import.meta.url).href,")
        lines.extend(['} as const;', 'export type BannerPatternId = keyof typeof bannerPatternUrls;', 'export const bannerPatternIds = Object.keys(bannerPatternUrls) as BannerPatternId[];', ''])
        write_output(ROOT / 'src/item-renderer-assets.ts', '\n'.join(lines).encode('utf8'), args.check)
        print('Verified' if args.check else 'Copied', len(assets), 'original textures;', len(choices), 'banner pattern IDs; all have matching installed candidates.')


if __name__ == '__main__':
    main()
