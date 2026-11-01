import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync, createPortal } from 'react-dom';
import { CreditsScreen } from '../src/credits-screen';
import { creditsGpuFixtureDefaults, creditsGpuFixtureProfile } from './credits-gpu-fixture-profile';
import '../src/credits-screen.css';
import '../src/credits-roll.css';
import '../src/credits-skip-button.css';

let options = { ...creditsGpuFixtureDefaults };
const root = createRoot(document.getElementById('root')!);
const qa: any = (window as any).creditsGpuQA = {
  events: [], props: () => options, saved: null,
  configure(patch: any = {}) { options = { ...options, ...patch }; qa.paint(); },
  paint() {
    const tag = options.tag;
    const element = createElement(CreditsScreen, { runKey: 'one-host-session', profile: creditsGpuFixtureProfile(options),
      content: { sections: [], endPoem: '', quote: '' }, bindings: { showEduIcon: false, showEndPoem: false, playerName: '', scrollFaster: false },
      scale: options.scale, skipLabel: 'Skip', open: options.open, hidden: options.hidden,
      ...(options.controlled ? { mode: 'controlled-source' as const, position: { offset: 0, elapsedMs: options.elapsedMs },
        snapshot: { introAgeMs: options.introAgeMs, backgroundElapsedMs: options.elapsedMs, skipButtonVisible: false, factory: { skipPanel: null, fadeOut: null } } }
        : { playback: { playing: options.playing, initialOffset: 0, hiddenPolicy: 'pause' as const } }),
      onCloseRequested: () => qa.events.push({ kind: 'close', tag }), onRenderError: (error: Error) => qa.events.push({ kind: 'error', tag, message: error.message }) });
    const tree = options.strict ? createElement(StrictMode, {}, element) : element;
    flushSync(() => root.render(qa.portal ? createPortal(tree, qa.portal) : tree));
  },
  unmount() { flushSync(() => root.render(null)); },
  raw() {
    const canvas = document.querySelector('[data-background-renderer="gui-layer"]') as HTMLCanvasElement;
    const gl = canvas.getContext('webgl')!, bottom = new Uint8Array(canvas.width * canvas.height * 4), top = new Uint8Array(bottom.length);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, bottom);
    for (let y = 0; y < canvas.height; y++) top.set(bottom.subarray(y * canvas.width * 4, (y + 1) * canvas.width * 4), (canvas.height - 1 - y) * canvas.width * 4);
    let binary = ''; for (let i = 0; i < top.length; i += 32768) binary += String.fromCharCode(...top.subarray(i, i + 32768));
    const ext = gl.getExtension('WEBGL_debug_renderer_info'); return { width: canvas.width, height: canvas.height, rgba: btoa(binary), renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null };
  },
};
const query = new URLSearchParams(location.search);
if (query.get('mount') !== 'no') qa.paint();
