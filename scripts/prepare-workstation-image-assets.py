"""Generate the private workstation PNG registry from an immutable public release.

No image is re-encoded. Requires only Python's standard library. Download the
release ZIP given by --help, then run this script (or --check for a read-only CI
check). --game optionally checks the installed base archive without modifying it.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
from pathlib import Path
import re
import struct
import zipfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
RELEASE = "v1.26.60.5"
COMMIT = "15701fa9c13923f12662984c32c124327e40e3d3"
ZIP_SHA = "d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf"
ZIP_URL = f"https://github.com/Mojang/bedrock-samples/releases/download/{RELEASE}/bedrock-samples-{RELEASE}-full.zip"
RAW = f"https://raw.githubusercontent.com/Mojang/bedrock-samples/{COMMIT}/"
LICENSE_SHA = "ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d"
BASE_UI_FILES = ("resource_pack/ui/ui_common.json", "resource_pack/ui/enchanting_screen.json", "resource_pack/ui/grindstone_screen.json")
UI_FILES = BASE_UI_FILES + ("resource_pack/ui/anvil_screen.json", "resource_pack/ui/resource_packs_screen.json")
# Preserve the original asset records when adding source screens: shared arrow
# and cross PNGs must not acquire extra references in previously frozen records.
REFERENCE_FILES = {
    "anvilIcon": ("resource_pack/ui/anvil_screen.json",),
    "anvilPlus": ("resource_pack/ui/anvil_screen.json",),
    "anvilCostBackground": ("resource_pack/ui/resource_packs_screen.json",),
    "editBox": ("resource_pack/ui/ui_common.json",),
    "editBoxHover": ("resource_pack/ui/ui_common.json",),
}
# key, original basename, physical dimensions, logical base, logical LTRB inset.
SPECS = [
    ("panel", "dialog_background_opaque", (16, 16), (16, 16), 4),
    ("cell", "cell_image", (10, 10), (5, 5), 1),
    ("selected", "recipe_book_touch_cell_selected", (4, 4), (4, 4), 1),
    ("focus", "focus_border_white", (5, 5), (5, 5), 1),
    ("highlight", "highlight_slot", (1, 1), (1, 1), 1),
    ("close", "close_button_default_compact", (15, 7), None, None),
    ("closeHover", "close_button_hover_compact", (15, 7), None, None),
    ("closePressed", "close_button_pressed_compact", (15, 7), None, None),
    ("lapis", "lapis_image", (16, 16), None, None),
    ("optionSelectable", "enchanting_active_background", (108, 19), (108, 19), 1),
    ("optionUnselectable", "enchanting_dark_background", (108, 19), (108, 19), 1),
    ("optionHover", "enchanting_active_background_with_hover_text", (108, 19), (108, 19), 1),
] + [
    (f"dust{state.title()}{tier}", f"dust_{state}_{tier}", (13, 11), None, None)
    for state in ("selectable", "unselectable") for tier in (1, 2, 3)
] + [
    ("closeNormal", "close_button_default", (15, 15), None, None),
    ("closeNormalHover", "close_button_hover", (15, 15), None, None),
    ("closeNormalPressed", "close_button_pressed", (15, 15), None, None),
    ("grindstoneArrow", "arrow_large", (22, 15), None, None),
    ("grindstoneInvalid", "crossout", (15, 15), None, None),
] + [
    ("anvilIcon", "anvil_icon", (15, 15), None, None),
    ("anvilPlus", "anvil-plus", (13, 13), None, None),
    ("anvilCostBackground", "Gray", (2, 2), (2, 2), 1),
    ("editBox", "edit_box_indent", (6, 6), (6, 6), 2),
    ("editBoxHover", "edit_box_indent_hover", (6, 6), (6, 6), 2),
]


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def jsonc(data: bytes):
    # Preserve strings, including embedded //, commas and brackets.
    token = r'"(?:\\.|[^"\\])*"|//[^\n]*|/\*[\s\S]*?\*/|,\s*(?=[}\]])'
    clean = re.sub(token, lambda m: m[0] if m[0].startswith('"') else '', data.decode('utf-8-sig'))
    return json.loads(clean)


def references(value, wanted: str, pointer=""):
    if isinstance(value, dict):
        for key, child in value.items():
            escaped = key.replace('~', '~0').replace('/', '~1')
            yield from references(child, wanted, pointer + '/' + escaped)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from references(child, wanted, pointer + '/' + str(index))
    elif value == wanted:
        yield pointer


def decode_png(data: bytes):
    """Decode noninterlaced original PNG pixels, preserving transparent RGB.

    These source images use RGBA8, RGB8 and indexed2. Implement the actual PNG
    filters and packed palette lookup instead of using browser/PMA readback.
    """
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('Not PNG')
    pos, packed, palette, transparency = 8, bytearray(), b'', b''
    while pos < len(data):
        size = struct.unpack_from('>I', data, pos)[0]
        tag, payload = data[pos + 4:pos + 8], data[pos + 8:pos + 8 + size]
        crc = struct.unpack_from('>I', data, pos + 8 + size)[0]
        if zlib.crc32(tag + payload) != crc:
            raise ValueError('PNG CRC mismatch')
        if tag == b'IHDR':
            width, height, depth, kind, compression, filtering, interlace = struct.unpack('>IIBBBBB', payload)
        elif tag == b'IDAT':
            packed.extend(payload)
        elif tag == b'PLTE':
            palette = payload
        elif tag == b'tRNS':
            transparency = payload
        pos += size + 12
        if tag == b'IEND':
            break
    if (compression, filtering, interlace) != (0, 0, 0):
        raise ValueError('Unsupported PNG compression/filter/interlace')
    if not ((kind in (2, 6) and depth == 8) or (kind == 3 and depth in (1, 2, 4, 8))):
        raise ValueError(f'Unsupported PNG color type {kind}/{depth}')
    channels = {2: 3, 3: 1, 6: 4}[kind]
    stride = (width * channels * depth + 7) // 8
    bpp = max(1, (channels * depth + 7) // 8)
    raw = zlib.decompress(packed)
    if len(raw) != (stride + 1) * height:
        raise ValueError('Unexpected PNG scanline size')
    previous = bytearray(stride)
    rgba = bytearray()
    for y in range(height):
        start = y * (stride + 1)
        filter_type, row = raw[start], bytearray(raw[start + 1:start + 1 + stride])
        if filter_type not in range(5):
            raise ValueError('Unknown PNG filter')
        for i in range(stride):
            a, b, c = (row[i - bpp] if i >= bpp else 0), previous[i], (previous[i - bpp] if i >= bpp else 0)
            p = a + b - c
            distances = (abs(p - a), abs(p - b), abs(p - c))
            paeth = (a, b, c)[distances.index(min(distances))]
            predictor = (0, a, b, (a + b) // 2, paeth)[filter_type]
            row[i] = (row[i] + predictor) & 255
        for x in range(width):
            if kind == 6:
                rgba.extend(row[x * 4:x * 4 + 4])
            elif kind == 2:
                rgb = row[x * 3:x * 3 + 3]
                transparent = bool(transparency) and tuple(rgb) == struct.unpack('>HHH', transparency)
                rgba.extend((*rgb, 0 if transparent else 255))
            else:
                bit = x * depth
                index = (row[bit // 8] >> (8 - depth - bit % 8)) & ((1 << depth) - 1)
                rgb = palette[index * 3:index * 3 + 3]
                if len(rgb) != 3:
                    raise ValueError('Missing palette entry')
                rgba.extend((*rgb, transparency[index] if index < len(transparency) else 255))
        previous = row
    return (width, height), bytes(rgba), {'bitDepth': depth, 'colorType': kind}


def installed_entries(game: Path):
    archive = game / 'data/resource_packs/vanilla/__brarchive/textures/ui.brarchive'
    data = archive.read_bytes()
    if data[:8] != bytes.fromhex('7d2725b1a0527026'):
        raise ValueError('Unexpected installed BRARCHIVE magic')
    count, version = struct.unpack_from('<II', data, 8)
    if version != 1:
        raise ValueError('Unexpected installed BRARCHIVE version')
    base = 16 + count * 256
    entries = {}
    for i in range(count):
        record = data[16 + i * 256:16 + (i + 1) * 256]
        name = record[1:1 + record[0]].decode('utf8')
        offset, size = struct.unpack_from('<II', record, 248)
        entries[name] = data[base + offset:base + offset + size]
    return entries


def generate(archive: Path, game: Path | None):
    if sha(archive.read_bytes()) != ZIP_SHA:
        raise ValueError('Release ZIP SHA256 mismatch')
    installed = installed_entries(game) if game else None
    with zipfile.ZipFile(archive) as source:
        license_bytes = source.read('LICENSE.md')
        if sha(license_bytes) != LICENSE_SHA:
            raise ValueError('Original license SHA256 mismatch')
        ui_bytes = {name: source.read(name) for name in UI_FILES}
        ui = {name: jsonc(data) for name, data in ui_bytes.items()}
        source_urls, registry, assets = [], [], []
        for key, name, expected_size, expected_base, expected_edge in SPECS:
            path = f'resource_pack/textures/ui/{name}.png'
            png = source.read(path)
            size, rgba, encoding = decode_png(png)
            if size != expected_size:
                raise ValueError(f'{name}: unexpected dimensions {size}')
            if installed is not None and installed.get(name + '.png') != png:
                raise ValueError(f'{name}: installed base original differs/missing')
            metadata_path = path[:-4] + '.json'
            metadata = None
            if metadata_path in source.namelist():
                original_metadata = source.read(metadata_path)
                metadata = jsonc(original_metadata)
            if expected_base is None:
                if metadata is not None:
                    raise ValueError(f'{name}: unexpected source metadata')
                nine_slice = None
            else:
                if metadata != {'nineslice_size': expected_edge, 'base_size': list(expected_base)}:
                    raise ValueError(f'{name}: original nine-slice changed')
                nine_slice = {'insets': [expected_edge] * 4, 'baseSize': list(expected_base)}
            refs = [{'source': file, 'jsonPointer': pointer} for file, parsed in ui.items() if file in REFERENCE_FILES.get(key, BASE_UI_FILES)
                    for pointer in references(parsed, 'textures/ui/' + name)]
            if not refs:
                raise ValueError(f'{name}: no literal original UI reference')
            record = {
                'keys': [key] + (['optionDark'] if key == 'optionUnselectable' else []),
                'source': path, 'pinnedUrl': RAW + path, 'sha256': sha(png), 'bytes': len(png),
                'sourceSize': list(size), 'rgbaSha256': sha(rgba), 'rgbaEncoding': 'row-major straight RGBA8, transparent RGB preserved',
                'pngEncoding': encoding, 'uiReferences': refs,
            }
            if nine_slice:
                record['nineSlice'] = nine_slice
                record['metadata'] = {'source': metadata_path, 'pinnedUrl': RAW + metadata_path,
                                      'sha256': sha(original_metadata), 'value': metadata}
            assets.append(record)
            source_urls.append(f"  {key}: 'data:image/png;base64,{base64.b64encode(png).decode('ascii')}',")
            nine = f', nineSlice: {json.dumps(nine_slice, separators=(",", ":"))}' if nine_slice else ''
            registry.append(f'  {key}: {{ url: originalPngUrls.{key}, sourceSize: {list(size)}{nine} }},')
        registry.append('  // Source permanent dark rows and unselectable overlays use the same PNG, at separate layers.')
        registry.append('  optionDark: { url: originalPngUrls.optionUnselectable, sourceSize: [108, 19], nineSlice: { insets: [1, 1, 1, 1], baseSize: [108, 19] } },')
        ts = '\n'.join([
            '// Generated by scripts/prepare-workstation-image-assets.py. Do not edit.',
            '// Internal original-image registry; intentionally absent from the public barrel.',
            '// PNG bytes are unmodified. Insets are logical game units, ordered LEFT/TOP/RIGHT/BOTTOM.',
            "import type { GuiImageNineSlice } from './gui-image-geometry';", '',
            'const originalPngUrls = {', *source_urls, '} as const;', '',
            'export const workstationImageAssets = {', *registry,
            '} as const satisfies Record<string, { url: string; sourceSize: readonly [number, number]; nineSlice?: GuiImageNineSlice }>;', '',
        ])
        manifest = {
            'schemaVersion': 1, 'generator': 'scripts/prepare-workstation-image-assets.py',
            'generatedModule': 'src/workstation-image-assets.ts',
            'release': RELEASE, 'releaseCommit': COMMIT,
            'archive': {'url': ZIP_URL, 'sha256': ZIP_SHA},
            'license': {'source': 'LICENSE.md', 'pinnedUrl': RAW + 'LICENSE.md', 'sha256': LICENSE_SHA,
                        'notice': license_bytes.decode('utf-8-sig')},
            'uiSources': [{'source': name, 'pinnedUrl': RAW + name, 'sha256': sha(data)} for name, data in ui_bytes.items()],
            'assetCount': len(assets), 'registryKeyCount': len(assets) + 1,
            'contract': {
                'encoding': 'Complete original PNG bytes embedded once per unique source; no image re-encoding or CSS parsing.',
                'nineSlice': 'Original JSON base_size and nineslice_size; insets are logical game units ordered left/top/right/bottom, not physical PNG pixel bands.',
                'focus': 'common.white_border_slot and its white_border control use textures/ui/focus_border_white, matching --mc-skin-inventory-focus. There is no white_border.png in this release.',
                'highlight': 'Original 1x1 base and 1-unit insets intentionally preserve reversed center UV bands; do not clamp or substitute a 2x2 base.',
                'dark': 'optionDark aliases optionUnselectable; permanent dark background and current unselectable/pressed overlay remain separate ordered uses.',
                'scope': 'Public release source evidence only; no private font/shader, active installed pack-stack assertion, or whole-GUI native-fidelity claim.',
                'installedCheck': f'Optional --game checks all {len(SPECS)} original PNGs against the installed vanilla base ui.brarchive; presence alone does not establish active pack stack.',
            },
            'assets': assets,
        }
        return {ROOT / 'src/workstation-image-assets.ts': ts.encode('utf8'),
                ROOT / 'docs/workstation-image-assets.json': (json.dumps(manifest, indent=2, ensure_ascii=False) + '\n').encode('utf8')}


def main():
    parser = argparse.ArgumentParser(description=__doc__, epilog='Original archive: ' + ZIP_URL)
    parser.add_argument('--archive', type=Path, default=ROOT / f'.cache/references/bedrock-samples-{RELEASE}-full.zip')
    parser.add_argument('--game', type=Path, help='Optional read-only installed Content directory byte comparison')
    parser.add_argument('--check', action='store_true', help='Check generated bytes without writing anything')
    args = parser.parse_args()
    outputs = generate(args.archive, args.game)
    stale = []
    for path, expected in outputs.items():
        same = path.is_file() and path.read_bytes() == expected
        if not same and args.check:
            stale.append(str(path.relative_to(ROOT)))
        elif not same:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(expected)
        print(f'{"OK" if same else "STALE" if args.check else "WROTE"} {path.relative_to(ROOT)} sha256={sha(expected)} bytes={len(expected)}')
    if stale:
        raise SystemExit('Generated files are stale: ' + ', '.join(stale))
    if args.game:
        print(f'Verified {len(SPECS)}/{len(SPECS)} original PNG bytes against installed vanilla base ui.brarchive (not active-pack proof).')


if __name__ == '__main__':
    main()
