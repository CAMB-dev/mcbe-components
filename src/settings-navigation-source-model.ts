import type {ReactNode,Ref} from 'react';
import type {SettingsNavigationProps,SettingsNavigationSection,SettingsNavigationGroup,SettingsNavigationSpacer} from './settings-navigation';

/** Private composition seam, never exported by the package barrel. */
export interface SourceSettingsNavigationSection extends SettingsNavigationSection {
  /** Replaces only the existing glyph slot contents. The host resolves exact
   * offsets, original images, animation and interaction ownership. */
  readonly glyphContent?:ReactNode;
  /** Private source instance max-size override; generic omitted profile remains[38,4]. */
  readonly sourceLabelMaxInset?:readonly[number,number];
}
interface SourceNodeBase {
  readonly id:string;readonly sourceControl:string;
  readonly ignored:boolean;readonly visible:boolean;readonly enabled:boolean;
}
export interface SourceSettingsNavigationStack extends SourceNodeBase {
  readonly kind:'source-stack';readonly children:readonly SourceSettingsNavigationNode[];
}
export interface SourceSettingsNavigationSlot extends SourceNodeBase {
  readonly kind:'source-slot';readonly height:number;readonly content:ReactNode;
}
export type SourceSettingsNavigationNode=SourceSettingsNavigationSection|SettingsNavigationGroup|SettingsNavigationSpacer|SourceSettingsNavigationStack|SourceSettingsNavigationSlot;
export interface SourceSettingsNavigationProps extends Omit<SettingsNavigationProps,'items'> {
  readonly nodes:readonly SourceSettingsNavigationNode[];
  readonly nodeRefs?:Readonly<Record<string,Ref<HTMLDivElement>>>;
}
/** Slot content is host-owned: inert wrappers protect native interaction, but
 * synthetic/direct callback calls are not a security boundary. The host must
 * also forward explicit effective disabled/hidden/inert state into slot controls
 * and use their current-owner request guards. No arbitrary React tree is cloned. */

export interface SourceSettingsNavigationPlanEntry {
  readonly id:string;readonly sourceControl:string;readonly kind:SourceSettingsNavigationNode['kind'];
  readonly box:readonly[number,number,number,number];
  /** Effective source ancestry; root disabled additionally blocks enabled.
   * Root hidden/inert do not rewrite source paint visibility or geometry. */
  readonly ignored:boolean;readonly visible:boolean;readonly enabled:boolean;
}
export interface SourceSettingsNavigationPlan {
  readonly width:number;readonly scale:number;readonly height:number;
  readonly entries:readonly SourceSettingsNavigationPlanEntry[];
}
