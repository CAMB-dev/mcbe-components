import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EnchantingTable } from '../src/workstations';
import type { EnchantingTableImageRenderProfile } from '../src/workstations';
import { renderGuiImages } from '../src/gui-image-webgl';
import '../src/styles.css';
import '../src/fonts.css';

interface Configuration {
  profile?: EnchantingTableImageRenderProfile;
  disabled?: boolean;
  empty?: boolean;
  inputs?: boolean;
  text?: boolean;
  close?: boolean;
}
declare global { interface Window { enchantingImageQA: any } }
window.enchantingImageQA = { events: [] as string[], profiles: [] };
function encode(data: Uint8Array | Uint8ClampedArray) { let text = ''; for (let i = 0; i < data.length; i += 32768) text += String.fromCharCode(...data.subarray(i, i + 32768)); return btoa(text); }
window.enchantingImageQA.raw = () => {
  const canvas = document.querySelector('canvas.mc-enchanting-image-layer') as HTMLCanvasElement;
  const gl = canvas.getContext('webgl')!, data = new Uint8Array(canvas.width * canvas.height * 4), output = new Uint8Array(data.length);
  gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
  for (let y = 0; y < canvas.height; y++) output.set(data.subarray((canvas.height - y - 1) * canvas.width * 4, (canvas.height - y) * canvas.width * 4), y * canvas.width * 4);
  const extension = gl.getExtension('WEBGL_debug_renderer_info');
  return { rgba: encode(output), width: canvas.width, height: canvas.height, rect: document.querySelector('.mc-enchanting-image-window')!.getAttribute('data-output-rect')!.split(',').map(Number),
    renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null, attributes: gl.getContextAttributes(), error: gl.getError() };
};
window.enchantingImageQA.reference = (options: any) => {
  const images = options.images.map((image: any) => ({ ...image, texture: { width: image.texture.width, height: image.texture.height, data: Uint8ClampedArray.from(atob(image.texture.rgba), character => character.charCodeAt(0)) } }));
  const result = renderGuiImages({ ...options, images }); const value = { width: result.width, height: result.height, rgba: encode(result.data) }; result.dispose(); return value;
};
function StatefulBook() {
  const [count, setCount] = useState(0);
  window.enchantingImageQA.incrementBook = () => setCount(value => value + 1);
  return <span data-host-book>HOST BOOK <span data-host-book-state>{count}</span></span>;
}
function App() {
  const [configuration, setConfiguration] = useState<Configuration>({ inputs: true, close: true });
  const [shown, setShown] = useState(true), [events, setEvents] = useState<string[]>([]);
  const emit = (text: string) => { window.enchantingImageQA.events.push(text); setEvents(value => [...value, text]); };
  window.enchantingImageQA.configure = (next: Configuration) => setConfiguration(value => ({ ...value, ...next }));
  window.enchantingImageQA.reopen = () => setShown(true);
  const options = configuration.empty ? [] : [1, 2, 3].map(tier => ({ id: 'option-' + tier, label: 'Option ' + tier, level: tier, disabled: configuration.disabled && tier === 2,
    runes: <span data-host-runes={tier}>Runes {tier}</span> }));
  return <>
    <div id="controls"><button onClick={() => setShown(true)}>Reopen table</button><button onClick={() => window.enchantingImageQA.incrementBook?.()}>Advance host book state</button></div>
    <div id="host">{shown && <EnchantingTable ref={node => { window.enchantingImageQA.section = node; }}
      imageRender={configuration.profile} title="Actual enchantment table" inventoryLabel="Actual inventory" options={options}
      item={configuration.inputs ? { name: 'Sample item', icon: <span data-host-item>ITEM</span> } : null}
      lapis={configuration.inputs ? { name: 'Lapis item', count: 8, icon: <span data-host-lapis>LAPIS</span> } : null}
      inventory={[{ name: 'Inventory diamond', icon: <span data-host-inventory>DIAMOND</span> }]}
      hotbar={[{ name: 'Hotbar apple', icon: <span data-host-hotbar>APPLE</span> }]}
      book={<StatefulBook/>}
      renderText={configuration.text ? (text, context) => <span data-host-text={context.kind}>{text}</span> : undefined}
      onInputAction={(slot, action) => emit(`input:${slot}:${action}`)} onEnchant={id => emit(`enchant:${id}`)}
      onInventoryAction={(index, action) => emit(`inventory:${index}:${action}`)}
      onClose={configuration.close ? () => { emit('close'); setShown(false); } : undefined}/>}</div>
    <div id="tail" data-following-content/>
    <output aria-label="Actual component events">{JSON.stringify(events)}</output>
  </>;
}
createRoot(document.getElementById('root')!).render(<App/>);
