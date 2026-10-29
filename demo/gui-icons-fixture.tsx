import { createRoot } from 'react-dom/client';
import { GuiIcon, PixelIcon, guiIconNames } from '../src';

declare global { interface Window { guiIconFixture: { ref: HTMLSpanElement | null; clicks: number; focus: number } } }
window.guiIconFixture = { ref: null, clicks: 0, focus: 0 };
const query = new URLSearchParams(location.search), scale = Number(query.get('scale') ?? 1);
const theme = query.get('theme') === 'light' ? '#c6c6c6' : '#28292a';
export function GuiIconsFixture() {
  return <>
    <nav aria-label="GuiIcon QA navigation"><a href="#semantics">Semantics</a><span>Original GUI icons</span></nav>
    <div data-icon-atlas style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 160px)', width: 1120, background: theme, color: '#ff0088' }}>
      {guiIconNames.map(name => <div key={name} data-icon-cell data-icon-name={name} style={{ position: 'relative', width: 160, height: 160 }}>
        <GuiIcon name={name} scale={scale} style={{ position: 'absolute', left: 8, top: 8 }}/>
      </div>)}
    </div>
    <section id="semantics" aria-label="GuiIcon semantic cases">
      <GuiIcon name="arrow-left-white" data-case="decorative"/>
      <GuiIcon name="arrow-left-white" label="Health symbol" data-case="labelled"/>
      <GuiIcon name="arrow-left-white" label="Fallback label" aria-label="Actual label" data-case="aria-label"/>
      <span id="gui-external-label">External label</span><GuiIcon name="arrow-left-white" aria-labelledby="gui-external-label" data-case="labelledby"/>
      <GuiIcon name="arrow-left-white" label="Hidden label" aria-hidden="true" data-case="explicit-hidden"/>
      <GuiIcon name="arrow-left-white" aria-hidden="true" role="presentation" data-case="explicit-role"/>
      <GuiIcon name="arrow-left-white" label="Reference icon" ref={node => { window.guiIconFixture.ref = node; }}
        className="custom-gui-icon" id="gui-icon-ref" tabIndex={0} data-marker="retained" scale={2}
        onClick={() => { window.guiIconFixture.clicks++; }} onFocus={() => { window.guiIconFixture.focus++; }}/>
      <button type="button"><GuiIcon name="arrow-left-white"/>Save</button>
      <PixelIcon name="heart" size={24} aria-label="Legacy pixel icon"/>
    </section>
  </>;
}
const element = document.getElementById('gui-icons-root');
if (element) createRoot(element).render(<GuiIconsFixture/>);
