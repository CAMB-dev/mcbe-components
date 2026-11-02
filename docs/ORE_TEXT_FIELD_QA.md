# Modern OreUI text fields

`OreTextField` and `OreFieldSection` implement the modern **menus** source profile.
They are separate from Classic `ExternalServerField`. Import
`mcbeui/ore-text-field.css` (also included by `mcbeui/styles.css`).

```tsx
import {useState} from 'react';
import {OreTextField, OreFieldSection} from 'mcbeui';
import 'mcbeui/ore-text-field.css';

function ServerName({skins}: {
  skins: {normal: string; disabled: string};
}) {
  const [value, setValue] = useState('');
  return <OreFieldSection label="服务器名称" description="为服务器选择一个名称。"
    locale="zh_CN" guiScale={2}>
    <OreTextField skins={skins} value={value}
      onChange={event => setValue(event.currentTarget.value)}/>
  </OreFieldSection>;
}
```

The required `skins` are **whole host-owned URLs**, not built-in replacements.
The modern normal/hover/focus image is one 6×7 PNG; disabled uses a separate
6×7 PNG. Their identities are metadata-only in
[ore-text-field-source.json](ore-text-field-source.json). They have no exact
byte or complete-RGBA alias among the fixed official sample's 5,125 real PNGs
(including 104 candidates of matching dimensions). Installed-private images
are not added to Git, `src/assets`, public files or the npm package. The optional
local demo command `python scripts/use-local-ore-text-field-assets.py` prepares
and checks unchanged originals in ignored cache. Restart Vite afterward.

`ref`, `className`, `style`, `name`, native event handlers and input attributes
apply to the real HTML input. `wrapperProps` / `wrapperRef` address its wrapper.
The input is text with string `value` / `defaultValue`; it retains native
selection, editing, IME and form reset behavior. No Classic maximum length,
numeric filtering, profanity service, server validation, save or join operation
is inherited. `readOnly` permits focus and selection; `disabled` uses the
disabled material. A standalone field needs its own accessible name.

`OreFieldSection` has a visible label and optional description. Generated IDs link
contained fields through context while preserving caller-supplied ARIA ID lists.
Multiple inputs in one section share its group label; supply their individual
names when they represent distinct values. Section appearance is inherited by
fields unless explicitly overridden. Sections use natural content height;
the default neutral background is #48494a with source .2rem upper white/.1 and
lower black/.3 bevel overlays. These are absolute paint, not flow borders;
the enclosing server panel's border is a separate composition.
`guiScale` maps to the existing Web Ore unit of `5 × guiScale` CSS pixels and
does not alter document `rem`. It is an explicit host profile, not a recovered
engine scale.

The source menus input declares Seven v2 1.6rem / line 2.8rem / minimum height
4.8rem, padding TRBL 1.2/1.2/.8/1.4rem, white text, placeholder #b1b2b5, green
caret #6cc349, disabled text #58585a and no text shadow. Host font registration
remains required for actual Seven/Noto output; only the separately documented
open substitutes are bundled. The image uses TRBL cuts 3/1/1/1 fill and image
widths .6/.2/.2/.2rem. Section horizontal padding is 2.4rem, top/bottom spacers
1.2rem, and label/input spacers .4rem. Source spacing token numbers are **not**
rem values. An earlier private study misread tokens 1/2/3 as literal rem;
the preserved corrective study establishes .4/.8/1.2rem before implementation.

`invalid` sets accessible invalid state; optional `invalidMessage` supplies
linked host feedback. There is no invented red skin. The source server port
route's correction/narration/shake is business behavior, not a generic input
rule. Native focus-decoration and shake timing have not been recovered for
this profile; keyboard focus uses an explicit Web outline. Forced colors hides
the image and uses system input/text/outline colors. These Web accommodations
are not claims of native raster parity.

One real current Ore Add Server frame was acquired through PIX 2610.28 and
preserved locally, including the complete 2570×1405 precomposed UI texture and
2570×1402 UI target. Independent CPU decode and actual SDK texture readback
agree on all 14,443,400 useful source RGBA bytes; row padding differs and is
not claimed equal. The capture contains a whole UI composite rather than
individual field draws. It supplies a future native comparison baseline;
it does not certify these components, a complete Ore server screen, native
input/selection behavior or the four pending Classic partial-alpha candidates.
No capture pixels, vertices, matrices or native UI backdrops are renderer inputs.

## Verified finite result

The final source browser batch `browser-02.json` passed 20/20, with no skips,
retries or flaky results: 14 desktop/Pixel 7 interaction checks and six complete
source material planes at guiScale 2/4/6, normal and disabled. All 149,760
material pixels matched all RGBA channels exactly. An independent reviewer
recomputed the six complete planes from the original PNGs and obtained zero
differences. This is material qualification, not native GUI qualification.

The checks cover real refs and input attributes, long unfiltered strings,
accepted/rejected controlled edits, native selection/readOnly/disabled Tab,
uncontrolled form submit/reset, composition event forwarding, label/description
IDs, invalid feedback, focus placeholder hiding, source section spacing and
neutral bevel, natural description growth, forced colors and accessibility.
Synthetic composition forwarding does not certify an operating-system IME.

Node final 16/16 passed. `npm run verify:package` package-02 passed the complete
build and actual React 18.3.1 / 19.3.1 consumers: 209 components, six data values,
12 functions, declarations and existing assets/licenses. Each new-family
consumer passed 29 SSR contracts and 13 strict-negative type contracts, with
no SSR service/ref/callback activity and exact source CSS bytes. Four actual
installed default Vite dev/prod × React 18/19 browser combinations passed,
including byte-exact transport of both caller-provided whole PNGs and forced
colors. Built main-gallery desktop/mobile both passed. Their finite functional
tarball SHA256 is
`9e94ee083acf7ba07c028b4fd937a8b9a6f35a6901ab805653d857a87b308039`.
Subsequent documentation-only packaging has a separate identity.

Preserved history: browser-01 passed before neutral section paint was restored;
only browser-02 qualifies the final section CSS. Package-01 built but failed
its old 207-component smoke expectation after two exports were added; the
current expected count is 209. Installed-browser-01 stopped because Chromium
serializes the equivalent four-side `3 1 1 1 fill` as `3 1 1 fill`; run-02
expands CSS shorthand before comparing all four cuts. No product, material,
RGBA threshold, expected image or mask was changed for that harness correction.
The first Python harness-copy attempt also failed before launching Vite due
to Windows default text encoding; the new copy reads explicit UTF-8.

All native and browser evidence stays under ignored local cache. PIX/Minecraft
were closed normally and Computer Use was reset immediately after acquisition.
Test-owned servers and headless browser contexts were closed; user preview
services were not taken over. The full library goal remains active/incomplete.
