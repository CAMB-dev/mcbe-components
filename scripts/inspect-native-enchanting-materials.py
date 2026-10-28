"""Verify installed shader provenance without exporting game shader binaries/assembly.

Windows only, using the system D3DDisassemble API. The JSON report contains
hashes, byte ranges and normalized equations, never private shader code.
"""
from pathlib import Path
import argparse
import ctypes
import hashlib
import json
import re
import struct
import sys

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MATERIALS = Path('C:/XboxGames/Minecraft for Windows/Content/data/renderer/materials')
SOURCES = [
    ('Entity.material.bin', 'ac39dc5bf532073e54cfae29e0d5f720f27b152004ea1b60d3883a6d20f22ac6',
     2352, 1828, '18c42db16689139b4badfca5badf5db9880c7abfe40eae8d62c02d6ae3aa420f', 'entity-light'),
    ('MeshFallbackPosUVNormalColor.material.bin', 'dee2c5324e868885b6fdce6c1a7231976470be32c6009d478ae5d91fcdfd5ce3',
     122279, 2256, '15aea4205dc317561394b4c58bf532044ffd9adc777560d007142ddfa64735ca', 'entity-light'),
    ('UIText.material.bin', '02d410506a3e180781992c66839432ed425bf0506fb8d258328d21959afb2d29',
     933, 572, '1d8136da24ffe850b471c6b7a855b55d6f5830547c75063d9099fb17cb15a1f7', 'bitmap-fragment'),
    ('UIText.material.bin', '02d410506a3e180781992c66839432ed425bf0506fb8d258328d21959afb2d29',
     1681, 892, '18ea5bfeb4a3fe19f4733778a2be3226e586d2e4c8aa92ccd7ae5c6d9b875d9b', 'bitmap-vertex'),
]

def disassembler():
    if sys.platform != 'win32':
        raise RuntimeError('Native material inspection requires Windows and d3dcompiler_47.dll.')
    library = ctypes.WinDLL('d3dcompiler_47.dll')
    function = library.D3DDisassemble
    function.restype = ctypes.c_long
    function.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_uint, ctypes.c_char_p, ctypes.POINTER(ctypes.c_void_p)]

    def inspect(data):
        source = ctypes.create_string_buffer(data)
        blob = ctypes.c_void_p()
        result = function(source, len(data), 0, None, ctypes.byref(blob))
        if result < 0:
            raise RuntimeError(f'D3DDisassemble failed: HRESULT 0x{result & 0xffffffff:08x}')
        table = ctypes.cast(blob, ctypes.POINTER(ctypes.POINTER(ctypes.c_void_p))).contents
        get_pointer = ctypes.WINFUNCTYPE(ctypes.c_void_p, ctypes.c_void_p)(table[3])
        get_size = ctypes.WINFUNCTYPE(ctypes.c_size_t, ctypes.c_void_p)(table[4])
        release = ctypes.WINFUNCTYPE(ctypes.c_ulong, ctypes.c_void_p)(table[2])
        try:
            return ctypes.string_at(get_pointer(blob), get_size(blob)).decode('utf-8').rstrip('\0')
        finally:
            release(blob)
    return inspect

def verify(materials):
    inspect = disassembler()
    records = []
    for filename, material_hash, offset, size, program_hash, purpose in SOURCES:
        data = (materials / filename).read_bytes()
        actual_hash = hashlib.sha256(data).hexdigest()
        if actual_hash != material_hash:
            raise ValueError(f'{filename}: expected game 1.26.6005.0 SHA256 {material_hash}; got {actual_hash}. No version equivalence inferred.')
        program = data[offset:offset+size]
        if program[:4] != b'DXBC' or struct.unpack_from('<I', program, 24)[0] != size:
            raise ValueError(f'{filename}: invalid fixed DXBC byte range.')
        if hashlib.sha256(program).hexdigest() != program_hash:
            raise ValueError(f'{filename}: compiled stage hash mismatch.')
        assembly = inspect(program)
        if purpose == 'entity-light':
            # Check arithmetic dependencies, not just the presence of constants.
            checks = [
                r'rsq r0\.w, r0\.w',
                r'mul r0\.xyz, r0\.wwww, r0\.xyzx',
                r'mad r0\.y, r0\.y, cb0\[\d+\]\.w, l\(1\.000000\)',
                r'mul r0\.xz, r0\.xxzx, r0\.xxzx',
                r'mul r0\.x, r0\.x, l\(-0\.100000\)',
                r'mad r0\.x, r0\.y, l\(0\.275000\), r0\.x',
                r'mad r0\.x, r0\.z, l\(0\.100000\), r0\.x',
                r'add r0\.x, r0\.x, l\(0\.450000\)',
            ]
            if filename == 'Entity.material.bin':
                checks += [r'mad r0\.x, cb0\[1\]\.w, l\(0\.350000\), r0\.x',
                           r'mul o3\.xyz, r0\.xxxx, cb0\[56\]\.xyzx']
            else:
                checks += [r'mul r0\.xyz, r0\.xxxx, cb0\[28\]\.xyzx',
                           r'mad o4\.xyzw, cb0\[9\]\.wwww, l\(0\.350000, 0\.350000, 0\.350000, 0\.350000\), r0\.xyzw']
        elif purpose == 'bitmap-fragment':
            checks = [r'max r0\.xy, v2\.xyxx, v3\.xyxx', r'min r0\.xy, r0\.xyxx, v2\.zwzz',
                      r'sample_indexable', r'mul r0\.xyzw, r0\.xyzw, v1\.xyzw',
                      r'mul r0\.xyzw, r0\.xyzw, cb1\[1\]\.xyzw', r'mul o0\.w, r0\.w, cb1\[0\]\.x']
        else:
            checks = [r'add r0\.x, v2\.x, l\(0\.062500\)', r'add o2\.xy, v2\.xyxx, cb0\[5\]\.xxxx',
                      r'add o2\.z, r0\.x, -cb0\[5\]\.x', r'add o2\.w, r0\.x, -cb0\[5\]\.x']
        if not all(re.search(pattern, assembly) for pattern in checks):
            raise ValueError(f'{filename}: normalized shader dependency checks failed.')
        records.append({'file': filename, 'materialSha256': material_hash, 'programByteRange': [offset, size],
                        'programSha256': program_hash, 'purpose': purpose, 'dependencyChecksPassed': len(checks)})
    return {'gameVersion': '1.26.6005.0', 'tool': 'Windows d3dcompiler_47.dll D3DDisassemble',
        'materials': records,
        'commonDirectionalTerm': 'L = 0.725 - 0.1*nx^2 + 0.1*nz^2 + 0.275*TileLightIntensity*ny',
        'normalizedEntityLight': '(L + 0.35*OverlayColor.a)*TileLightColor',
        'normalizedMeshFallbackLight': 'L*TileLightColor + 0.35*OverlayColor.a',
        'bookCandidateAssumptions': {'TileLightIntensity': 1, 'TileLightColor': [1,1,1], 'OverlayColor.a': 0,
            'normalSpace': 'Unit face normal after model fold and complete GUI pose, including camera pitch/roll.'},
        'bitmapEvidence': 'Selected Bitmap shader clamps UV to per-glyph bounds before sampling, then multiplies vertex color, TintColor and alpha HudOpacity. Vertex stage uses GlyphHeight and HalfTexelOffset.',
        'notEstablished': ['Actual enchanting_book_renderer material selection/uniform values',
                           'Native book mesh/UV extraction', 'Rune-specific Bitmap variant/sampler binding and full native text raster'],
        'exportsPrivateAssemblyOrBinary': False}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--materials-dir', type=Path, default=DEFAULT_MATERIALS)
    parser.add_argument('--output', type=Path, default=ROOT/'.cache/native-material-proof.json')
    args = parser.parse_args()
    report = verify(args.materials_dir)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(f'Verified {len(report["materials"])} fixed native shader stages; hashes/equations only: {args.output}')
