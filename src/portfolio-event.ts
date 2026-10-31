import type { SyntheticEvent } from 'react';
import { deferClassicEvent } from './classic-screen-lifecycle';

/** Private Portfolio task boundary. Capture the owner window before React
 * clears currentTarget; no timer is created by importing or rendering SSR. */
export function schedulePortfolioTask(owner: HTMLElement, run: () => void): void {
  const view = owner.ownerDocument.defaultView;
  if (view) view.setTimeout(run, 0);
  else setTimeout(run, 0);
}

/** A trusted native click may checkpoint microtasks between the React-root
 * listener and a later document listener. Wait for that native propagation
 * task to finish before the unchanged shared guard/snapshot bridge runs. */
export function deferPortfolioEvent<T extends HTMLElement, E extends SyntheticEvent<T>>(
  event: E, owner: T, run: (snapshot: E) => void, active: () => boolean = () => true,
): void {
  event.persist();
  schedulePortfolioTask(owner, () => deferClassicEvent(event, owner, run, active));
}
