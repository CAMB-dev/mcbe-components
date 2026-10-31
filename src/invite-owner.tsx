import { createContext } from 'react';
import type { InviteActionTarget, InviteCollection, InviteScope } from './invite-types';
/** Private controller transport. These records do not poll devices or synthesize native events. */
export type InviteOwnedControl = {
  readonly kind: 'selection'; readonly scope: InviteScope; readonly control: HTMLInputElement;
  readonly request: (value?: boolean) => boolean;
} | {
  readonly kind: 'party'; readonly control: HTMLInputElement; readonly request: (value?: boolean) => boolean;
} | {
  readonly kind: 'action'; readonly target: InviteActionTarget; readonly collection?: InviteCollection;
  readonly scope?: InviteScope; readonly control: HTMLButtonElement; readonly request: () => boolean;
};
export interface InviteOwner {
  readonly owns: (control: HTMLElement, scope?: InviteScope) => boolean;
  readonly register: (entry: InviteOwnedControl) => () => void;
}
export const InviteOwnerContext = createContext<InviteOwner>({ owns: () => true, register: () => () => {} });
