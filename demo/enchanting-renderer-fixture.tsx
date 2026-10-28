import { useState } from 'react';
import { EnchantingBook } from '../src';

export function EnchantingRendererFixture() {
  const [open,setOpen]=useState(1), [pageFlip,setPageFlip]=useState(0), [error,setError]=useState('');
  return <section data-enchanting-renderer-fixture aria-label="Controlled enchanting renderer">
    <h2>Enchanting book controls</h2>
    <EnchantingBook aria-label="Controlled enchanting book" open={open} pageFlip={pageFlip} onRendererError={setError}/>
    <label>Book openness<input aria-label="Book openness" type="range" min={0} max={1} step={.25} value={open} onChange={event=>setOpen(Number(event.target.value))}/></label>
    <label>Book page turn<input aria-label="Book page turn" type="range" min={0} max={1} step={.25} value={pageFlip} onChange={event=>setPageFlip(Number(event.target.value))}/></label>
    <output role="status" aria-label="Book renderer errors">{error}</output>
  </section>;
}
