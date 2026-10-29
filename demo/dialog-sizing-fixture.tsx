import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Dialog, TextField } from '../src/components';
import type { DialogProps } from '../src/components';
import { ScrollArea } from '../src/scroll-area';
import '../src/styles.css';

const modes = ['default', 'numeric', 'css-length', 'style-override', 'oversize', 'host-scroll', 'external-form'] as const;
type Mode = typeof modes[number];
const sizes: Record<Mode, Pick<DialogProps, 'width' | 'height' | 'style'>> = {
  default: {}, numeric: { width: 640, height: 360 },
  'css-length': { width: 'calc(100vw - 120px)', height: '20rem' },
  'style-override': { width: 640, height: 360, style: { width: 520, height: 300 } },
  oversize: { width: 700, height: 1100 },
  'host-scroll': { width: 480, height: 360 },
  'external-form': { width: 520, height: 320 },
};
export function DialogSizingFixture() {
  const [mode, setMode] = useState<Mode>('default'), [open, setOpen] = useState(false);
  const [submission, setSubmission] = useState(''), [scroll, setScroll] = useState(0);
  return <main>
    <h1>Dialog dimensions and host scrolling</h1>
    <nav aria-label="Dialog specimens" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {modes.map(value => <button key={value} type="button" onClick={() => { setMode(value);setOpen(true); }}>Open {value} dialog</button>)}
    </nav>
    <form id="dialog-external-form" onSubmit={event => {
      event.preventDefault();const data = new FormData(event.currentTarget);
      setSubmission(JSON.stringify([...data.entries()]));setOpen(false);
    }}/>
    <output aria-label="Dialog submission">{submission}</output>
    <output aria-label="Host scroll position">{scroll}</output>
    <Dialog open={open} onOpenChange={setOpen} title={`Sizing ${mode}`} description="The caller owns content overflow." {...sizes[mode]}
      footer={mode === 'external-form'
        ? <Button form="dialog-external-form" type="submit" name="action" value="save">Save external form</Button>
        : <><Button onClick={() => setOpen(false)}>Footer done</Button><Button onClick={() => setOpen(false)}>Footer cancel</Button></>}>
      {mode === 'external-form' ? <TextField label="World name" form="dialog-external-form" name="world" required/>
        : mode === 'host-scroll' ? <ScrollArea label="Host-controlled scroll content" style={{ height: 140 }} onScrollPositionChange={position => setScroll(position.scrollTop)}>
          <div style={{ height: 1000 }}><p>Start of host content</p><p style={{ paddingTop: 800 }}>End of host content</p></div>
        </ScrollArea>
        : <div data-oversized-content style={{ width: 1500, height: 1600, background: '#203040' }}>
          <p>Oversized caller content is clipped by this dialog.</p><div style={{ marginTop: 1400 }}>Far edge</div>
        </div>}
    </Dialog>
  </main>;
}
const root = document.getElementById('dialog-sizing-root');
if (root) createRoot(root).render(<DialogSizingFixture/>);
