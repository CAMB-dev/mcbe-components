"""Copy the user's original SGA font atlas to ignored local preview storage.

Usage: python scripts/use-local-runes.py 'C:/XboxGames/Minecraft for Windows/Content'
Only reads the install; never installs a font or changes game files.
"""
from pathlib import Path
import hashlib
import struct
import sys

root = Path(__file__).resolve().parent.parent
game = Path(sys.argv[1]).resolve(strict=True)
archive = game / 'data/resource_packs/vanilla/__brarchive/font.brarchive'
data = archive.read_bytes()
count, version = struct.unpack_from('<II', data, 8)
assert version == 1 and 0 < count < 100000, 'Unsupported archive table'
base = 16 + count * 256
assert base <= len(data)
for index in range(count):
    record = data[16 + index * 256:16 + (index + 1) * 256]
    length = record[0]
    assert 0 < length < 248
    if record[1:1 + length].decode('utf-8') != 'ascii_sga.png':
        continue
    offset, size = struct.unpack_from('<II', record, 248)
    assert base + offset + size <= len(data)
    image = data[base + offset:base + offset + size]
    assert image.startswith(b'\x89PNG\r\n\x1a\n'), 'Expected PNG atlas'
    target = root / '.cache/enchanting-source/font/ascii_sga.png'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(image)
    print(f'Local SGA atlas prepared: {target}; SHA256 {hashlib.sha256(image).hexdigest()}')
    print('Restart Vite to enable it in the local preview. This atlas is excluded from npm and Git.')
    break
else:
    raise SystemExit('The original SGA atlas was not found in this install.')
