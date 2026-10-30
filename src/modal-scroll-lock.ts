// Private shared lifecycle utility. No public runtime export.
const locks = new WeakMap<Document, { count: number; value: string; priority: string }>();

export function lockModalScroll(doc: Document) {
  let state = locks.get(doc);
  if (!state) {
    const style = doc.documentElement.style;
    state = { count: 0, value: style.getPropertyValue('overflow'), priority: style.getPropertyPriority('overflow') };
    locks.set(doc, state);
    style.setProperty('overflow', 'hidden');
  }
  state.count++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const current = locks.get(doc);
    if (current && --current.count === 0) {
      const style = doc.documentElement.style;
      if (current.value) style.setProperty('overflow', current.value, current.priority);
      else style.removeProperty('overflow');
      locks.delete(doc);
    }
  };
}
