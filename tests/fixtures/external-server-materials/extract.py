"""Keep a finite set of whole official files for independent material tests.

Initial preparation: python .../extract.py --reference FIXED_FULL_ZIP
Read-only checkout verification: python .../extract.py --check
"""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent
ARCHIVE_SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf'
COMMIT = '15701fa9c13923f12662984c32c124327e40e3d3'
IMAGES = ['dialog_background_hollow_2', 'control', 'edit_box_indent', 'edit_box_indent_hover',
          'button_borderless_light', 'button_borderless_lighthover', 'button_borderless_lightpressed',
          'disabledButtonNoBorder', 'focus_border_white', 'close_button_default', 'close_button_hover', 'close_button_pressed']
UI = ['add_external_server_screen', 'ui_common', 'ui_common_classic', 'ui_template_buttons', '_global_variables', 'ui_template_dialogs']
sha = lambda b: hashlib.sha256(b).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    manifest = ROOT / 'ORIGINALS.json'
    if args.check:
        data = json.loads(manifest.read_text(encoding='utf-8'))
        assert data['archive']['sha256'] == ARCHIVE_SHA
        for entry in data['files']:
            b = (ROOT / 'ORIGINALS' / entry['entry']).read_bytes()
            assert len(b) == entry['bytes'] and sha(b) == entry['sha256'], entry['entry']
        print(json.dumps({'check': True, 'originalFiles': len(data['files']), 'writes': 0}))
        return
    if not args.reference:
        parser.error('--reference is required for initial extraction')
    h = hashlib.sha256()
    with args.reference.open('rb') as f:
        while b := f.read(1024 * 1024):
            h.update(b)
    assert h.hexdigest() == ARCHIVE_SHA, 'Wrong original archive; no outputs written'
    files = {}
    with zipfile.ZipFile(args.reference) as archive:
        names = set(archive.namelist())
        for member in ['LICENSE.md'] + ['resource_pack/ui/' + n + '.json' for n in UI]:
            files[member] = archive.read(member)
        for name in IMAGES:
            for extension in ['.png', '.json']:
                member = 'resource_pack/textures/ui/' + name + extension
                if extension == '.png' or member in names:
                    files[member] = archive.read(member)
    records = []
    for member, b in files.items():
        destination = ROOT / 'ORIGINALS' / member
        destination.parent.mkdir(parents=True, exist_ok=True)
        if not destination.exists() or destination.read_bytes() != b:
            destination.write_bytes(b)
        records.append({'entry': member, 'bytes': len(b), 'sha256': sha(b)})
    result = {'archive': {'commit': COMMIT, 'bytes': args.reference.stat().st_size, 'sha256': ARCHIVE_SHA},
              'scope': 'Whole original source/material/metadata/license files, never reencoded or capture-derived', 'files': records}
    data = (json.dumps(result, indent=2) + '\n').encode()
    if not manifest.exists() or manifest.read_bytes() != data:
        manifest.write_bytes(data)
    print(json.dumps({'originalFiles': len(records), 'archiveSHA': ARCHIVE_SHA}))


if __name__ == '__main__':
    main()
