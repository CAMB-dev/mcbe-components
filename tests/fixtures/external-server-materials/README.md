# Independent External Server material planes

Nineteen complete no-text source-material references, frozen before this family's first browser measurement. These files do not import ClassicSkin, production layout/renderers, capture data, browser pixels or private resources. The generator reads only the fixed whole originals and metadata retained here; generated EXPECTED images are test expectations, never product art.

The exact official source is Bedrock Samples commit15701fa9c13923f12662984c32c124327e40e3d3, full archive169569258B SHA d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf. ORIGINALS contains12 complete original PNGs,9 exact companion metadata files,6 whole UI source JSONC files and the original LICENSE.md:28files. No asset is cropped, redrawn, recolored or reencoded. Original bytes are pinned independently of expected PNG/RGBA identities.

| Material | Complete logical plane | States and scales |
|---|---|---|
| Panel |316×179 including all edges/underfill|normal scale1/2|
| Field group |295×38 including label10band, full editor25, trailing3|normal/hover/disabled scale1/2|
| Action button |150×30 including full outer focus border and148×28 face|normal/hover/pressed/locked scale1/2|
| Close button |21×21 including the full3-unit halo around15×15 image|normal/hover/pressed scale1|

External backdrop is opaque#203040, DPR1, integer CSS origin. Every pixel and every RGBA byte of the entire control plane is compared, without masks, crops, excluded borders, tolerance or thresholds. PNG compression hashes and decoded RGBA hashes are separately frozen in PROTOCOL.json.

The CPU algorithm maps destination pixel **centres** through independent piecewise nine-slice intervals using rational/integer floor arithmetic. It consumes raw original cuts: panel[8,23,8,42] on18×67, edit2 on6², button1 on4², focus1 on5². The locked2² image's source centre is zero; all four original pixels are uniform, so the predeclared clamped-boundary interpretation cannot affect this finite result. Close uses the full original15² with an integer inset3. Scale2 is source material magnification, not a claim about a recovered native GUI scale algorithm.

Panel composition paints original control2² at inset4/alpha.8 then the complete hollow2skin. Disabled editor retains the original skin at opacity.5. These partial-opacity expectations deliberately reuse the **earlier independently scalar/holdout-qualified Chromium CSS opaque-image UNORM8 profile**:

`A = floor(sourceAlpha * opacity + .5)`

`output = floor(sourceRGB * (A+1) / 256) + floor(backdropRGB * (256-A) / 256)`

This is explicitly a finite observed Web profile, **not** native linear RGBA/Skia ISA recovery or a universal blending law. Its reference is the existing file-transmission CALIBRATED-WEB-01 protocol SHA201b9cb747c3fb614c6f99dec73e52fc699d767918f9a72b4203566439447f37. It was not calibrated against this family. It predicts source9 at.8 over#203040 as13/16/20; a one-final-round continuous formula would predict14/17/20 and is not silently substituted. Original focus-border white multiplied by.075 gives19 after nearest UNORM8, away from a half tie.

The separately owned fixture is `/demo/external-server-fixture.html?materials=1`, controlled by `window.externalServerMaterial.setMaterial({kind,state,scale})`. It renders the real production controls, isolates other paint/label ink, and forces exactly one original state painter. That explicit test-host state forcing does not certify natural hover/pressed/focus routing. The target selector returned by the fixture identifies the complete actual control; no source geometry is imported into the expected generator. Opaque backdrop, original wash opacity and disabled opacity remain unchanged. Natural interaction/typing tests belong to the other external-server spec.

Reproduce/check without any browser or private files:

```powershell
python tests/fixtures/external-server-materials/extract.py --reference .cache/references/bedrock-samples-v1.26.60.5-full.zip
python tests/fixtures/external-server-materials/extract.py --check
node tests/fixtures/external-server-materials/generate.mjs --check
```

The extractor copies complete bytes only after verifying the whole fixed archive hash. A different hash fails before output. Check mode needs no archive and writes nothing. Generation is deterministic/idempotent in the checked environment. All19 planes are CPU-prepared; no browser/native pass is claimed here. Any later actual failure must retain the complete actual and frozen expected identities. Change product/harness in a separately recorded revision; do not edit expected images after observing their output to make them pass. These planes do not certify native UI, fonts, source variable evaluator, dimensions outside the finite profile or the natural combined server screen.
