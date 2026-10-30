"""Prepare/check whole official NPC color pages and source descriptions.

Source bank, manifest and private registry only; no public API wiring.
--check is read-only and requires no archive/private cache. Preparation requires
--reference with the fixed full ZIP. All selected files are validated before any
output is replaced; replacement is atomic per file, not a bank-wide transaction.
No network, image encoding, Molang execution, renderer or product build is used.
"""
from pathlib import Path, PurePosixPath
import argparse
from collections import Counter
import hashlib
import json
import os
import re
import struct
import tempfile
import zipfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
OWNED = ROOT / 'src/assets/npc-actor'
MANIFEST = ROOT / 'docs/npc-actor-assets.json'
REGISTRY = ROOT / 'src/npc-actor-assets.ts'
ARCHIVE_SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'
COMMIT = '15701fa9c13923f12662984c32c124327e40e3d3'
LICENSE_SHA = 'ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d'
GROUPS = [('npc', 10), ('npc_scientist', 10), ('npc_apiary', 5),
          ('npc_teacher', 5), ('npc_construction', 5), ('npc_Agriculture', 10),
          ('npc_BusinessMobs', 5), ('npc_EverydayBusiness', 5), ('npc_Kiosk', 5)]
ALIASES = [f'{prefix}_{i}' for prefix, count in GROUPS for i in range(1, count + 1)]
SOURCE_FILES = {
    'geometry': 'resource_pack/models/entity/npc.geo.json',
    'npcAnimations': 'resource_pack/animations/npc.animation.json',
    'lookAtTargetAnimation': 'resource_pack/animations/look_at_target.animation.json',
    'renderController': 'resource_pack/render_controllers/npc.render_controllers.json',
    'clientEntity': 'resource_pack/entity/npc.entity.json',
    'behaviorEntity': 'behavior_pack/entities/npc.json',
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def png_rgba(data):
    """Bounded audit decoder for these original noninterlaced 64x64 PNGs only.

    Both actual encodings are retained: 51 RGBA8 and 9 indexed8. No conversion
    is written. Decode expands palette/tRNS exactly, with no alpha threshold.
    """
    if data[:8] != b'\x89PNG\r\n\x1a\n' or len(data) > 65536:
        raise ValueError('Unexpected bounded original PNG.')
    offset, parts, seen = 8, {}, []
    while offset < len(data):
        if offset + 12 > len(data):
            raise ValueError('Truncated PNG chunk.')
        length = struct.unpack_from('>I', data, offset)[0]
        tag = data[offset + 4:offset + 8]
        end = offset + 12 + length
        if end > len(data) or length > 65536:
            raise ValueError('PNG chunk exceeds source bound.')
        body = data[offset + 8:offset + 8 + length]
        crc = struct.unpack_from('>I', data, offset + 8 + length)[0]
        if zlib.crc32(tag + body) & 0xffffffff != crc:
            raise ValueError('PNG CRC differs.')
        if tag in (b'IHDR', b'PLTE', b'tRNS', b'IEND') and tag in parts:
            raise ValueError('Duplicate singleton PNG chunk.')
        parts.setdefault(tag, []).append(body)
        seen.append(tag)
        offset = end
        if tag == b'IEND':
            break
    if offset != len(data) or seen[0] != b'IHDR' or seen[-1] != b'IEND':
        raise ValueError('PNG chunk structure differs.')
    if len(parts[b'IHDR'][0]) != 13:
        raise ValueError('Unexpected PNG IHDR size.')
    width, height, depth, color, compression, filtering, interlace = struct.unpack('>IIBBBBB', parts[b'IHDR'][0])
    if (width, height, depth, compression, filtering, interlace) != (64, 64, 8, 0, 0, 0) or color not in (3, 6):
        raise ValueError('Only original 64x64 RGBA8/indexed8 source encodings are accepted.')
    bpp = 4 if color == 6 else 1
    stride = width * bpp
    expected = height * (stride + 1)
    decoder = zlib.decompressobj()
    raw = decoder.decompress(b''.join(parts.get(b'IDAT', [])), expected + 1)
    if len(raw) != expected or not decoder.eof or decoder.unused_data or decoder.unconsumed_tail:
        raise ValueError('PNG deflate size differs from bounded source dimensions.')
    decoded, prior = bytearray(), bytearray(stride)
    for row in range(height):
        start = row * (stride + 1)
        kind, current = raw[start], bytearray(raw[start + 1:start + 1 + stride])
        if kind > 4:
            raise ValueError('Unknown PNG filter.')
        for x in range(stride):
            left = current[x - bpp] if x >= bpp else 0
            above = prior[x]
            upper_left = prior[x - bpp] if x >= bpp else 0
            if kind == 1:
                predictor = left
            elif kind == 2:
                predictor = above
            elif kind == 3:
                predictor = (left + above) // 2
            elif kind == 4:
                p = left + above - upper_left
                distances = [abs(p - left), abs(p - above), abs(p - upper_left)]
                predictor = [left, above, upper_left][distances.index(min(distances))]
            else:
                predictor = 0
            current[x] = (current[x] + predictor) & 255
        decoded.extend(current)
        prior = current
    if color == 6:
        return bytes(decoded), color
    palette = b''.join(parts.get(b'PLTE', []))
    transparency = b''.join(parts.get(b'tRNS', []))
    if not palette or len(palette) % 3 or len(palette) > 768 or len(transparency) > len(palette) // 3:
        raise ValueError('Unexpected indexed palette.')
    rgba = bytearray()
    for index in decoded:
        if index * 3 + 3 > len(palette):
            raise ValueError('PNG index exceeds source palette.')
        rgba.extend(palette[index * 3:index * 3 + 3])
        rgba.append(transparency[index] if index < len(transparency) else 255)
    return bytes(rgba), color


def expected_destination(entry):
    return 'src/assets/npc-actor/' + PurePosixPath(entry).name


def target(record):
    destination = expected_destination(record['entry'])
    if record['destination'] != destination:
        raise ValueError('Output must retain its exact whole original basename.')
    result = ROOT / destination
    for path in [ROOT / 'src', ROOT / 'src/assets', OWNED, result]:
        if path.is_symlink() or (hasattr(path, 'is_junction') and path.is_junction()):
            raise ValueError('NPC asset output may not follow symlink/junction entries.')
        if path.resolve() != path.absolute():
            raise ValueError('NPC output path resolves outside its literal owned path.')
    if result.parent != OWNED or not result.resolve().is_relative_to(OWNED.resolve()):
        raise ValueError('NPC destination escapes owned directory.')
    return result


def records(manifest):
    fixed = manifest['fixedSource']
    if (fixed['sha256'] != ARCHIVE_SHA or fixed['commit'] != COMMIT or
            fixed['release'] != 'v1.26.60.5-full'):
        raise ValueError('Unexpected fixed official source.')
    images = manifest['skins']
    if len(images) != 60 or [r['alias'] for r in images] != ALIASES:
        raise ValueError('All 60 exact-case ordered aliases must be retained.')
    for i, image in enumerate(images):
        if (image['variantArrayIndex'] != i or image['dimensions'] != [64, 64] or
                image['entry'] != f'resource_pack/textures/entity/npc/{ALIASES[i]}.png'):
            raise ValueError('Source variant/path/dimensions differ.')
    source = manifest['sourceFiles']
    if len(source) != 6 or {r['role']: r['entry'] for r in source} != SOURCE_FILES:
        raise ValueError('Six exact whole source description files are required.')
    license_record = manifest['license']
    if (license_record['entry'] != 'LICENSE.md' or license_record['bytes'] != 222 or
            license_record['sha256'] != LICENSE_SHA):
        raise ValueError('Original Mojang/EULA license notice is required.')
    bundled = [*images, *source, license_record]
    destinations = [str(target(record)) for record in bundled]
    if len({p.casefold() for p in destinations}) != 67:
        raise ValueError('Case-folded output paths collide.')
    if len({r['alias'].casefold() for r in images}) != 60:
        raise ValueError('Case-folded skin aliases collide.')
    return bundled


def verify(data, record):
    if len(data) != record['bytes'] or sha(data) != record['sha256']:
        raise ValueError('Whole original differs: ' + record['entry'])
    if record['entry'].endswith('.png'):
        rgba, color = png_rgba(data)
        histogram = {str(k): v for k, v in sorted(Counter(rgba[3::4]).items())}
        if (sha(rgba) != record['rgbaSha256'] or histogram != record['alphaHistogram'] or
                color != record['pngColorType']):
            raise ValueError('Decoded source RGBA/alpha differs: ' + record['entry'])


def registry_text(manifest):
    lines = ['// Generated private source registry. No public barrel export.',
             '// Whole source descriptions are data, not an engine/Molang interpreter.',
             'export const npcActorSkins = [']
    for image in manifest['skins']:
        name = PurePosixPath(image['entry']).name
        lines.append(f"  {{ variant: {image['variantArrayIndex']}, alias: '{image['alias']}', url: new URL('./assets/npc-actor/{name}', import.meta.url).href, sourceSize: [64, 64] }},")
    lines += ['] as const;', "export type NpcActorSkinAlias = typeof npcActorSkins[number]['alias'];",
              "export type NpcActorSourceVariant = typeof npcActorSkins[number]['variant'];",
              'export const npcActorSourceFiles = {']
    for record in manifest['sourceFiles']:
        name = PurePosixPath(record['entry']).name
        lines.append(f"  {record['role']}: new URL('./assets/npc-actor/{name}', import.meta.url).href,")
    lines += ['} as const;', '']
    return '\n'.join(lines)


def verify_registry(manifest):
    # Git checkouts may use CRLF; only text identity normalizes newlines.
    # Original PNG/JSON/LICENSE payload bytes are NEVER normalized.
    if REGISTRY.read_text(encoding='utf-8') != registry_text(manifest):
        raise ValueError('Private registry exact-case order/URLs/types differ.')


def verify_source_mapping(payloads, manifest):
    # Whole pinned source JSONs currently use strict JSON; no eval or expression
    # interpreter is introduced. Parsed expressions are compared only as data.
    by_role = {r['role']: json.loads(payloads[r['entry']].decode('utf-8-sig'))
               for r in manifest['sourceFiles']}
    entity = by_role['clientEntity']['minecraft:client_entity']['description']
    controller = by_role['renderController']['render_controllers']['controller.render.npc']
    if (entity['identifier'] != 'minecraft:npc' or entity['geometry'] != {'default': 'geometry.npc'} or
            entity['render_controllers'] != ['controller.render.npc'] or
            controller['textures'] != ['Array.skins[query.variant]'] or
            controller['geometry'] != 'Geometry.default' or
            controller['arrays']['textures']['Array.skins'] != ['Texture.' + alias for alias in ALIASES] or
            entity['textures'] != {alias: 'textures/entity/npc/' + alias for alias in ALIASES}):
        raise ValueError('Client/controller source selection differs.')
    if 'geometry.npc' not in by_role['geometry']:
        raise ValueError('Original NPC source geometry missing.')
    if by_role['behaviorEntity']['minecraft:entity']['description']['identifier'] != 'minecraft:npc':
        raise ValueError('Original NPC behavior description differs.')


def replace(path, data):
    if path.exists() and path.read_bytes() == data:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix='.npc-actor-', suffix='.tmp', dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, 'wb') as output:
            output.write(data)
        # Atomic entry replacement also avoids writing through external hardlinks.
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--reference', type=Path)
    args = parser.parse_args()
    if not args.check and args.reference is None:
        parser.error('Preparation requires --reference with the fixed official full ZIP.')
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    bundled = records(manifest)
    verify_registry(manifest)
    shared = manifest['sharedLicense']
    if shared != {'path': 'src/assets/Minecraft-Sample-LICENSE.md', 'entry': 'LICENSE.md', 'bytes': 222, 'sha256': LICENSE_SHA}:
        raise ValueError('Existing shared original-license reference differs.')
    verify((ROOT / shared['path']).read_bytes(), shared)
    expected_files = {target(record).name for record in bundled}
    if OWNED.exists() and any(p.name not in expected_files or not p.is_file() for p in OWNED.iterdir()):
        raise ValueError('Unexpected file/directory in owned asset bank; no cleanup is performed.')
    if args.reference:
        if args.reference.resolve().is_relative_to(OWNED.resolve()):
            raise ValueError('Reference must remain outside owned outputs.')
        with args.reference.open('rb') as reference:
            if hashlib.file_digest(reference, 'sha256').hexdigest() != ARCHIVE_SHA:
                raise ValueError('Unexpected official full ZIP SHA256.')
        with zipfile.ZipFile(args.reference) as archive:
            names = Counter(archive.namelist())
            payloads = {}
            for record in bundled:
                if names[record['entry']] != 1:
                    raise ValueError('Missing/duplicate exact-case source ZIP entry.')
                info = archive.getinfo(record['entry'])
                if info.file_size != record['bytes'] or info.file_size > 65536:
                    raise ValueError('Unexpected bounded original entry size.')
                data = archive.read(info)
                verify(data, record)
                payloads[record['entry']] = data
            verify_source_mapping(payloads, manifest)
            if not args.check:
                for record in bundled:
                    replace(target(record), payloads[record['entry']])
    payloads = {}
    for record in bundled:
        data = target(record).read_bytes()
        verify(data, record)
        payloads[record['entry']] = data
    verify_source_mapping(payloads, manifest)
    print(json.dumps({'wholePNG': 60, 'PNGBytes': sum(r['bytes'] for r in manifest['skins']),
                      'wholeSourceJSON': 6, 'license': True, 'sharedLicense': True,
                      'orderedVariantAliases': 60, 'allDecodedRGBA': [64, 64],
                      'readOnly': args.check, 'upstreamVerified': args.reference is not None,
                      'alphaThresholdApplied': False, 'mersOrPbrSupport': False,
                      'engineExpressionsExecuted': False, 'nativeMappingVerified': False}))


if __name__ == '__main__':
    main()
