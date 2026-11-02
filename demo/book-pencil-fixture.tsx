import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { BookEditor } from '../src/book';
import { bookAssets } from '../src/book-assets';
import '../src/styles.css';
interface Config { raster: boolean; mode: 'pages' | 'signing'; bad: boolean; retry: number; disabled: boolean; spread: number }
declare global { interface Window { bookPencilQA: { configure(next: Partial<Config>): void; actions: number[]; errors: { index: number; message: string }[] } } }
const actions: number[] = [], errors: { index: number; message: string }[] = [];
function App() {
  const [config, setConfig] = useState<Config>({ raster: true, mode: 'pages', bad: false, retry: 0, disabled: false, spread: 0 });
  window.bookPencilQA = { configure(next) { flushSync(() => setConfig(value => ({ ...value, ...next }))); }, actions, errors };
  return <div style={{ position: 'absolute', left: 60.5, top: 40.5 }}>
    <BookEditor pages={['', '', '', '']} spreadIndex={config.spread} mode={config.mode} disabled={config.disabled}
      layout={{ unitScale: 2, pencilRaster: config.raster ? { frameSize: [900, 600], origin: [30.25, 20.25], renderKey: config.retry } : undefined }}
      pageActions={() => ({ edit: true })} onPageAction={(_action, index) => actions.push(index)}
      onPencilRenderError={(error, index) => errors.push({ index, message: error.message })}
      skin={config.bad ? { pageActions: { edit: [bookAssets.book_edit_default.url, '/missing-pencil-image.png', bookAssets.book_edit_pressed.url] } } : undefined}/>
  </div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
