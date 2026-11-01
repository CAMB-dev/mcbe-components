import type { CSSProperties } from 'react';
import type { ChatFontSpec, ChatPresentationProfile, ChatTextRenderer, ChatTextRole } from './chat-types';

/** Private glyph seam. Callers snapshot the entire model before rendering. */
export function ChatGlyph({ text, role, profile, renderText, color = '#fff', shadow = false, font = profile.fonts.chrome, id }: {
  text: string; role: ChatTextRole; profile: ChatPresentationProfile; renderText?: ChatTextRenderer;
  color?: string; shadow?: boolean; font?: ChatFontSpec; id?: string;
}) {
  const context = Object.freeze({ role, font: Object.freeze({ ...font }), scale: profile.scale, color, shadow, ...(id === undefined ? {} : { id }) });
  const style: CSSProperties = { fontFamily: font.family, fontSize: font.logicalSize * profile.scale,
    lineHeight: `${font.lineHeight * profile.scale}px`, color,
    textShadow: shadow ? `${profile.scale}px ${profile.scale}px 0 color-mix(in srgb, ${color} 25%, black)` : 'none' };
  return <span className="mc-chat-glyph" style={style}>{renderText
    ? <><span aria-hidden="true" className="mc-chat-glyph__visual">{renderText(text, context)}</span><span className="mc-chat-glyph__literal">{text}</span></>
    : text}</span>;
}
