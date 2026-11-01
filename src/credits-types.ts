import type { BitmapFont } from './bitmap-text-engine';

/** Plain enumerable data records and dense plain arrays, in original array order. No original credits/poem/font bytes are bundled. */
export interface CreditsTitleGroup { readonly title: string; readonly names: readonly string[] }
export interface CreditsDiscipline { readonly discipline: string; readonly titles: readonly CreditsTitleGroup[] }
export interface CreditsSectionData { readonly section: string; readonly disciplines: readonly CreditsDiscipline[] }
export interface CreditsContent { readonly sections: readonly CreditsSectionData[]; readonly endPoem: string; readonly quote: string }
export type CreditsTextRole = 'section'|'discipline'|'title'|'name'|'poem'|'quote';
export type CreditsPath = readonly (string|number)[];
export interface CreditsSourceSpan {
  /** Relative to content or profile as selected by origin; offsets use original UTF-16 units. */
  readonly origin:'content'|'profile';readonly path: CreditsPath; readonly start: number; readonly end: number;
  /** Inserted text is literal and is never scanned again for formatting/placeholders. */
  readonly insertion?: {readonly path: readonly ['playerName'];readonly start:number;readonly end:number};
}
/** One original bitmap face. Lookup uses only its declared glyph table, never image/advance heuristics. */
export interface CreditsBitmapFace {
  /** Source glyph pixels to profile logical units; outer Roll scale applies once afterward. */
  readonly kind:'bitmap';readonly font:BitmapFont;readonly scale:number;
  readonly sampling:'point'|'bilinear';readonly shader:'bitmap'|'bitmap-smooth';
  readonly renderProfile:'atlas-rect'|'bedrock-unicode';
}
export type CreditsMissingGlyphPolicy={readonly kind:'error'}|{readonly kind:'replacement';readonly character:string};
export interface CreditsCssFace {
  /** Narrow, synchronous, pure metrics seam. It supplies no content or renderer. */
  readonly kind:'css-face';readonly family:string;readonly fontSize:number;readonly metricsId:string;
  readonly measureText:(text:string)=>number;
}
/** Resolved renderable font: no fallback lookup is delegated to the view. */
export type CreditsDirectFontSource=CreditsBitmapFace|CreditsCssFace;
export type CreditsFontSource=(CreditsBitmapFace&{readonly missingGlyph:CreditsMissingGlyphPolicy})|CreditsCssFace|{
  /** Explicit host order, limited to sixteen bitmap faces; no native routing priority is implied. */
  readonly kind:'bitmap-fallback';readonly faces:readonly CreditsBitmapFace[];readonly missingGlyph:CreditsMissingGlyphPolicy;
};
export interface CreditsTextStyle {
  readonly font:CreditsFontSource;readonly lineHeight:number;readonly letterSpacing:number;
  readonly color:string;readonly shadow:{readonly x:number;readonly y:number;readonly color:string}|null;
}
export interface CreditsBlockSpacing {readonly before:number;readonly after:number;readonly insetStart:number;readonly insetEnd:number}
export type CreditsColorCode='2'|'3'|'7'|'a'|'b'|'f';
export interface CreditsMarkupPolicy {
  readonly roles:readonly CreditsTextRole[];
  readonly colors:Readonly<Record<CreditsColorCode,string>>;
  readonly obfuscated:{readonly alphabet:string;readonly periodMs:number;readonly seed:number;readonly preserveAdvance:boolean};
  readonly colorResetsObfuscated:boolean;
  /** r reset support is an explicit Web policy, not an observed installed token. */
  readonly resetCode:'r'|null;
  readonly playerNameToken:{readonly token:'PLAYERNAME';readonly replacement:'literal-all'};
  readonly unknownCode:'literal'|'discard-marker';
}
export interface CreditsLayoutLimits {
  readonly maxSections:number;readonly maxDisciplines:number;readonly maxTitles:number;readonly maxNames:number;
  readonly maxInputUnits:number;readonly maxExpandedUnits:number;readonly maxTokens:number;
  readonly maxParagraphs:number;readonly maxLines:number;readonly maxRuns:number;readonly maxStages:number;
  readonly maxFontGlyphs:number;readonly maxMeasureCalls:number;readonly maxMeasuredUnits:number;readonly maxContentHeight:number;
}
export interface CreditsDecoration {
  readonly id:string;readonly text:string;readonly style:CreditsTextStyle;readonly block:CreditsBlockSpacing;readonly align:'left'|'center'|'right';
  readonly whenEmpty:'include'|'omit';readonly provenance:'host-authored-decoration'|'entry-scoped-measurement';readonly evidenceId:string;
}
export interface CreditsLayoutProfile {
  readonly viewport:{readonly size:readonly[number,number];readonly contentWidth:number;readonly contentX:number};
  readonly styles:Readonly<Record<CreditsTextRole,CreditsTextStyle>>;
  /** Staff before/after surrounds each hierarchy group, including its descendants. */
  readonly blocks:Readonly<Record<CreditsTextRole,CreditsBlockSpacing>>;
  readonly emptyDiscipline:'omit-and-collapse'|'retain-line';readonly emptyTitle:'omit-and-collapse'|'retain-line';
  readonly paragraphs:'hard-lines'|'blank-separated';readonly paragraphGap:number;readonly paragraphBlankLines:'retain'|'collapse';
  /** break-word splits at code points; an indivisible wide code point overflows unless error is selected. */
  readonly wrap:'word'|'code-point'|'preserve-lines';readonly longWord:'overflow'|'break-word'|'error';
  readonly horizontalWhitespace:'preserve'|'collapse';readonly wrapWhitespace:'retain'|'discard-at-break';
  readonly textAlign:Readonly<Record<CreditsTextRole,'left'|'center'|'right'>>;readonly gatedStageSpacing:'omit'|'retain';
  readonly markup:CreditsMarkupPolicy;readonly limits:CreditsLayoutLimits;
  /** Optional decoration is profile-authored, never fabricated as content data. */
  readonly decorations?:Partial<Record<CreditsTextRole,{readonly beforeHeading:readonly CreditsDecoration[];readonly afterHeading:readonly CreditsDecoration[]}>>;
  readonly provenance:'host-resolved-web-profile'|'measured-profile';readonly evidenceId:string;
}
export interface CreditsWholeImage {readonly src:string;readonly naturalSize:readonly[number,number];readonly displaySize:readonly[number,number];readonly alt:string;readonly provenance:string}
export type CreditsStage = {readonly id:string;readonly kind:'staff'|'end-poem'|'quote';readonly before:number;readonly after:number}
  |{readonly id:string;readonly kind:'brand';readonly brand:'primary'|'education';readonly image:CreditsWholeImage;readonly align:'left'|'center'|'right';readonly before:number;readonly after:number};
export interface CreditsRollPlan {readonly stages:readonly CreditsStage[];readonly initialLead:number;readonly completionGap:number}
export interface CreditsLayoutBindings {readonly showEduIcon:boolean;readonly showEndPoem:boolean;readonly playerName:string}
export type CreditsTextToken = {
  readonly kind:'text';readonly text:string;readonly source:CreditsSourceSpan;readonly literal:boolean;
} | {readonly kind:'break';readonly source:CreditsSourceSpan;readonly literal:boolean}
  | {readonly kind:'format';readonly operation:'color'|'obfuscated'|'reset';readonly code:string;readonly color?:string;readonly source:CreditsSourceSpan};
export interface CreditsLayoutRun {
  readonly text:string;readonly resolvedText:string;readonly x:number;readonly y:number;readonly width:number;
  readonly font:CreditsDirectFontSource;readonly color:string;readonly shadow:CreditsTextStyle['shadow'];readonly obfuscated:boolean;
  readonly letterSpacing:number;readonly sources:readonly CreditsSourceSpan[];
  /** All x coordinates include viewport.contentX. All y coordinates are roll content coordinates. CSS character positions are prefix-advance boundaries; render CSS as whole runs to preserve shaping. */
  readonly characters:readonly {readonly text:string;readonly resolvedText:string;readonly x:number;readonly advance:number;readonly source:CreditsSourceSpan}[];
}
export interface CreditsLayoutLine {
  readonly nodeIndex:number;readonly paragraphIndex:number;readonly role:CreditsTextRole;readonly text:string;
  readonly x:number;readonly y:number;readonly width:number;readonly height:number;readonly availableWidth:number;
  readonly hardBreakAfter:boolean;readonly decorationId?:string;readonly runs:readonly CreditsLayoutRun[];
}
export interface CreditsLayoutParagraph {
  readonly nodeIndex:number;readonly origin:'content'|'profile';readonly sourcePath:CreditsPath;readonly sourceStart:number;readonly sourceEnd:number;
  readonly blank:boolean;readonly omitted:boolean;readonly top:number;readonly height:number;readonly lineRange:readonly[number,number];
}
export interface CreditsLayoutNode {
  readonly role:CreditsTextRole;readonly sourcePath:CreditsPath;readonly textPath:CreditsPath;readonly text:string;
  readonly parent:number|null;readonly stageId:string;readonly children:readonly number[];
  readonly status:'laid-out'|'empty-retained'|'empty-collapsed';readonly top:number;readonly height:number;
  readonly headingLineRange:readonly[number,number];readonly lineRange:readonly[number,number];
}
export interface CreditsLayoutImage {readonly stageId:string;readonly image:CreditsWholeImage;readonly x:number;readonly y:number;readonly width:number;readonly height:number}
export interface CreditsLayoutStage {readonly id:string;readonly kind:CreditsStage['kind'];readonly active:boolean;readonly top:number;readonly height:number;readonly lineRange:readonly[number,number];readonly nodeRange:readonly[number,number];readonly imageRange:readonly[number,number]}
export interface CreditsLayoutUsage {sections:number;disciplines:number;titles:number;names:number;inputUnits:number;expandedUnits:number;tokens:number;paragraphs:number;lines:number;runs:number;stages:number;fontGlyphs:number;measureCalls:number;measuredUnits:number}
export interface CreditsLayout {
  readonly viewport:CreditsLayoutProfile['viewport'];readonly contentHeight:number;readonly completionOffset:number;
  readonly nodes:readonly CreditsLayoutNode[];readonly paragraphs:readonly CreditsLayoutParagraph[];
  readonly lines:readonly CreditsLayoutLine[];readonly images:readonly CreditsLayoutImage[];readonly stages:readonly CreditsLayoutStage[];
  readonly usage:Readonly<CreditsLayoutUsage>;
  /** Validated view snapshot; limits are post-layout remaining budgets and may be zero. */
  readonly presentation:{readonly obfuscated:CreditsMarkupPolicy['obfuscated'];readonly limits:Pick<CreditsLayoutLimits,'maxMeasureCalls'|'maxMeasuredUnits'>};
  readonly trace:{readonly authoredRendererSize:readonly['65%','100%'];readonly profileProvenance:CreditsLayoutProfile['provenance'];readonly evidenceId:string;readonly nativeCertified:false};
}
export interface CreditsLayoutRequest {readonly content:CreditsContent;readonly profile:CreditsLayoutProfile;readonly plan:CreditsRollPlan;readonly bindings:CreditsLayoutBindings}
