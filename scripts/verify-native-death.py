"""Local-only evidence check. Never copy installed HTML UI bundles or fonts into outputs."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INSTALL = Path('C:/XboxGames/Minecraft for Windows/Content')
manifest = json.loads((ROOT / 'docs/game-controls-geometry.json').read_text(encoding='utf-8'))
profile = manifest['geometry']['DeathScreen']['nativeProfile']
for entry in profile['sourceProof']:
    raw = (INSTALL / entry['installedPath']).read_bytes()
    actual = hashlib.sha256(raw).hexdigest()
    if actual != entry['sha256']:
        raise ValueError('Installed source changed; re-audit required: ' + entry['installedPath'])

html = (INSTALL / profile['sourceProof'][0]['installedPath']).read_text(encoding='utf-8')
script = (INSTALL / profile['sourceProof'][1]['installedPath']).read_text(encoding='utf-8')
css = (INSTALL / profile['sourceProof'][2]['installedPath']).read_text(encoding='utf-8')
for text in ['gameplay-6de8e340eddced55490b.js', 'gameplay-2778064b6874c712adbb.css']:
    assert text in html, text
for text in ['BN.spaceAbove', 'BN.spaceBetween', 'BN.spaceBelow', 'type:"header3"', 'variant:"hero"', 'type:"body"']:
    assert text in script, text
for text in ['width:32rem', 'radial-gradient(50% 50% at 50% 50%', 'font-family:"Minecraft Ten v2"', 'font-family:"Minecraft Seven v2"']:
    assert text in css, text
print('Verified', len(profile['sourceProof']), 'private installed evidence hashes and death entry/layout declarations. No source binaries copied.')
