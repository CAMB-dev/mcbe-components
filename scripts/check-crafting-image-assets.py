"""Verify/publish Crafting PNG provenance using the fixed official full ZIP.

No network, image re-encoding, product build or game installation is required.
Run normally to generate docs/crafting-image-assets.json; --check is read-only.
Uses the existing workstation source parser and lossless PNG decoder (stdlib).
"""
from __future__ import annotations

import argparse
import base64
import importlib.util
import json
from pathlib import Path
import re
import sys
import zipfile

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
PARSER = ROOT / 'scripts/prepare-workstation-image-assets.py'
spec = importlib.util.spec_from_file_location('workstation_asset_sources', PARSER)
source = importlib.util.module_from_spec(spec)
spec.loader.exec_module(source)
REGISTRY = 'src/crafting-image-assets.ts'
SHARED = 'src/workstation-image-assets.ts'
OUTPUT = ROOT / 'docs/crafting-image-assets.json'


def source_text_sha(path: Path) -> str:
    """Portable source identity under the repository's eol=lf policy.

    This applies only to the two UTF-8 TypeScript source texts. ZIP entries,
    PNGs, original metadata, decoded RGBA and the license remain raw bytes.
    """
    data = path.read_bytes()
    data.decode('utf-8')  # Reject a non-UTF-8 source rather than changing it.
    return source.sha(data.replace(b'\r\n', b'\n'))


def block(text: str, declaration: str) -> str:
    tail = text.split(declaration + ' = {', 1)[1]
    return tail.split('} as const', 1)[0]


def registry_records(text: str):
    records = {}
    pattern = re.compile(r'^\s*("[^"]+"|\w+): \{ url: (.*?), sourceSize: (\[[^\]]+\])(?:, nineSlice: (\{.*\}))? \},\s*$')
    for line in block(text, 'export const craftingImageAssets').splitlines():
        if not line.strip():
            continue
        match = pattern.fullmatch(line)
        if not match:
            raise ValueError('Unsupported Crafting registry syntax: ' + line[:90])
        key, url, size, nine_slice = match.groups()
        key = json.loads(key) if key.startswith('"') else key
        if key in records:
            raise ValueError('Duplicate registry key: ' + key)
        metadata = None
        if nine_slice:
            metadata = json.loads(re.sub(r'([{,])\s*(\w+)\s*:', r'\1"\2":', nine_slice))
        records[key] = {'urlExpression': url, 'dimensions': json.loads(size), 'nineSlice': metadata}
    if len(records) != 63:
        raise ValueError(f'Expected the current 63 original PNG entries, found {len(records)}')
    return records


def shared_urls(text: str):
    # Resolve the two actual symbol tables, rather than taking the nth base64.
    literals = dict(re.findall(r"^\s*(\w+): '(data:image/png;base64,[^']+)',\s*$",
                               block(text, 'const originalPngUrls'), re.M))
    aliases = dict(re.findall(r'^\s*(\w+): \{ url: originalPngUrls\.(\w+),',
                              block(text, 'export const workstationImageAssets'), re.M))
    return {key: literals[target] for key, target in aliases.items()}


def normalized_slice(value):
    if value is None:
        return None
    insets = value['insets']
    return {'insets': [insets] * 4 if isinstance(insets, (int, float)) else insets,
            'baseSize': value['baseSize']}


def generate(archive: Path) -> bytes:
    if source.sha(archive.read_bytes()) != source.ZIP_SHA:
        raise ValueError('Official full-release archive SHA256 mismatch')
    registry_text = (ROOT / REGISTRY).read_text(encoding='utf-8')
    shared_text = (ROOT / SHARED).read_text(encoding='utf-8')
    records, shared = registry_records(registry_text), shared_urls(shared_text)
    assets = {}
    with zipfile.ZipFile(archive) as upstream:
        license_bytes = upstream.read('LICENSE.md')
        if source.sha(license_bytes) != source.LICENSE_SHA:
            raise ValueError('Original upstream license SHA256 mismatch')
        # Match complete encoded bytes. Duplicated upstream files remain explicit.
        pngs = {name: upstream.read(name) for name in upstream.namelist()
                if name.startswith('resource_pack/textures/ui/') and name.endswith('.png')}
        by_sha = {}
        for name, data in pngs.items():
            by_sha.setdefault(source.sha(data), []).append(name)
        for key, record in records.items():
            expression = record['urlExpression']
            alias = re.fullmatch(r'shared\.(\w+)\.url', expression)
            url = shared[alias.group(1)] if alias else json.loads(expression)
            prefix = 'data:image/png;base64,'
            if not url.startswith(prefix):
                raise ValueError(key + ': expected complete embedded PNG URL')
            png = base64.b64decode(url[len(prefix):], validate=True)
            digest = source.sha(png)
            matches = sorted(name for name in by_sha.get(digest, []) if pngs[name] == png)
            if not matches:
                raise ValueError(key + ': no complete byte-identical upstream PNG')
            preferred = 'resource_pack/textures/ui/' + key + '.png'
            original = preferred if preferred in matches else matches[0]
            dimensions, rgba, encoding = source.decode_png(png)
            if list(dimensions) != record['dimensions']:
                raise ValueError(key + ': registry sourceSize does not match original PNG')
            metadata_path = original[:-4] + '.json'
            metadata = None
            if metadata_path in upstream.namelist():
                raw = upstream.read(metadata_path)
                parsed = source.jsonc(raw)
                metadata = {'source': metadata_path, 'pinnedUrl': source.RAW + metadata_path,
                            'bytes': len(raw), 'sha256': source.sha(raw), 'value': parsed}
                expected = {'insets': parsed['nineslice_size'], 'baseSize': parsed['base_size']}
                if normalized_slice(record['nineSlice']) != normalized_slice(expected):
                    raise ValueError(key + ': registry nine-slice differs from original metadata')
            elif record['nineSlice'] is not None:
                raise ValueError(key + ': missing original nine-slice metadata')
            assets[key] = {'source': original, 'pinnedUrl': source.RAW + original,
                           'bytes': len(png), 'dimensions': list(dimensions), 'pngSha256': digest,
                           'rgbaSha256': source.sha(rgba), 'pngEncoding': encoding,
                           'nineSlice': record['nineSlice'], 'originalMetadata': metadata,
                           'registryUrl': 'shared.' + alias.group(1) + '.url' if alias else 'inline-data-url',
                           'completePngByteIdentity': True}
            if len(matches) > 1:
                assets[key]['otherByteIdenticalUpstreamFiles'] = [name for name in matches if name != original]
    result = {
        'schemaVersion': 1, 'profile': 'bedrock-classic-crafting-source-images',
        'release': source.RELEASE, 'releaseCommit': source.COMMIT,
        'archiveUrl': source.ZIP_URL, 'archiveSha256': source.ZIP_SHA,
        'registry': {'path': REGISTRY, 'sha256': source_text_sha(ROOT / REGISTRY),
                     'hashNormalization': 'Only registry and sharedRegistry source SHA256: UTF-8 bytes with CRLF normalized to LF, matching repository eol=lf. All archive/PNG/metadata/RGBA/license hashes use original raw bytes.',
                     'entries': len(assets), 'sharedUrlAliases': sum(a['registryUrl'] != 'inline-data-url' for a in assets.values()),
                     'sharedRegistry': {'path': SHARED, 'sha256': source_text_sha(ROOT / SHARED)}},
        'license': {'source': 'LICENSE.md', 'pinnedUrl': source.RAW + 'LICENSE.md',
                    'bytes': len(license_bytes), 'sha256': source.LICENSE_SHA,
                    'bundledLicense': 'dist/assets/Minecraft-Sample-LICENSE.md',
                    'notice': '(c) Mojang AB. All rights reserved. Original repository assets are subject to the Minecraft End User License Agreement, not this project MIT license.'},
        'nonPngPrimitive': {'sourceSymbol': 'src/crafting-source-geometry.ts:solidWhite',
                            'sourceMaterial': 'textures/ui/White', 'dimensions': [2, 2],
                            'rgba': [255, 255, 255, 255], 'kind': 'normal RGBA pixel input',
                            'countedInOriginalPngEntries': False,
                            'note': 'Uppercase White is a plain material primitive, not a 64th original PNG. The separate lowercase white registry PNG remains one of the 63 original files.'},
        'boundaries': ['Every entry resolves its actual inline/shared URL and matches complete encoded PNG bytes in the pinned official ZIP; no cropping or image re-encoding.',
                       'RGBA hashes use the existing lossless source PNG decoder with CRC checks and preserve transparent RGB; not browser/PMA readback.',
                       'This provenance does not certify active resource packs, runtime bindings, geometry, fonts, native sampling, or whole-GUI pixel equality. No private font pages or capture data are included.'],
        'verification': {'command': 'python scripts/check-crafting-image-assets.py --check',
                         'archiveOption': '--archive PATH', 'dependencies': 'Python standard library; existing scripts/prepare-workstation-image-assets.py',
                         'generation': 'Omit --check to write this deterministic manifest; script never downloads or changes source files.'},
        'assets': assets,
    }
    lines = [json.dumps(key) + ': ' + json.dumps(value, ensure_ascii=False, separators=(',', ':'))
             for key, value in result.items() if key != 'assets']
    lines.append('"assets": {\n' + ',\n'.join('    ' + json.dumps(key) + ': ' + json.dumps(value, ensure_ascii=False, separators=(',', ':'))
                                               for key, value in assets.items()) + '\n  }')
    return ('{\n  ' + ',\n  '.join(lines) + '\n}\n').encode('utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__, epilog='Official archive: ' + source.ZIP_URL)
    parser.add_argument('--archive', type=Path, default=ROOT / f'.cache/references/bedrock-samples-{source.RELEASE}-full.zip')
    parser.add_argument('--check', action='store_true', help='Read-only byte comparison against the published manifest')
    args = parser.parse_args()
    expected = generate(args.archive)
    if args.check:
        if not OUTPUT.is_file() or OUTPUT.read_bytes() != expected:
            raise SystemExit('STALE docs/crafting-image-assets.json; regenerate with this script')
    else:
        OUTPUT.write_bytes(expected)
    print(f'OK 63 original PNG entries, resolved shared aliases, metadata and RGBA hashes; manifest sha256={source.sha(expected)}')


if __name__ == '__main__':
    main()
