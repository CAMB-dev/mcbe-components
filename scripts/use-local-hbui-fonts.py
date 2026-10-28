"""Prepare optional, unchanged fonts from the user's installed HBUI.

Outputs stay in ignored .cache/local-fonts/hbui. No game files are modified.
The Vite-only virtual font module consumes these files; npm never includes them.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re

project_root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('game_content', nargs='?', default='C:/XboxGames/Minecraft for Windows/Content')
args = parser.parse_args()
source_dir = Path(args.game_content) / 'data/gui/dist/hbui/fonts'
destination = project_root / '.cache/local-fonts/hbui'
specifications = [
    ('ten', r'Minecraft-Ten-[0-9a-f]+\.otf', 'Minecraft-Ten-v2.otf', 'Minecraft Ten v2', True),
    ('seven', r'Minecraft-Seven-[0-9a-f]+\.otf', 'Minecraft-Seven-v2.otf', 'Minecraft Seven v2', True),
    ('zh-hans', r'NotoSansSC-Regular-[0-9a-f]+\.otf', 'NotoSansSC-Regular.otf', 'Noto Sans SC', False),
]
selected = []
for key, pattern, filename, family, required in specifications:
    matches = sorted(path for path in source_dir.glob('*.otf') if re.fullmatch(pattern, path.name))
    if not matches and not required:
        continue
    if len(matches) != 1:
        raise SystemExit(f'Expected one {family} font in {source_dir}; found {len(matches)}.')
    selected.append((key, matches[0], filename, family))

destination.mkdir(parents=True, exist_ok=True)
records = []
for key, source, filename, family in selected:
    content = source.read_bytes()
    target = destination / filename
    target.write_bytes(content)
    records.append({
        'key': key, 'source': str(source), 'file': str(target.relative_to(project_root)),
        'cssFamily': family, 'bytes': len(content),
        'sha256': hashlib.sha256(content).hexdigest(), 'modifications': 'None',
    })
media = []
loading_source = Path(args.game_content) / 'data/gui/dist/hbui/assets/animation-074ed0ba8c16bb30e36c.gif'
if loading_source.is_file():
    content = loading_source.read_bytes()
    media_dir = project_root / '.cache/local-hbui-assets'
    media_dir.mkdir(parents=True, exist_ok=True)
    target = media_dir / 'loading-indicator.gif'
    target.write_bytes(content)
    media.append({
        'source': str(loading_source), 'file': str(target.relative_to(project_root)),
        'sha256': hashlib.sha256(content).hexdigest(), 'bytes': len(content), 'modifications': 'None',
    })
(destination / 'provenance.json').write_text(json.dumps({
    'distribution': 'Local preview only; separately owned fonts, excluded from Git and npm.',
    'fonts': records, 'media': media,
}, indent=2) + '\n', encoding='utf-8')
print(f'Prepared {len(records)} unchanged local HBUI fonts and {len(media)} optional loading asset in ignored cache.')
