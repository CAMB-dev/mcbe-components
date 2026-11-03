import {useClassicBottomFollow} from './classic-bottom-follow';
import { forwardRef, useCallback, useRef } from 'react';
import type { CSSProperties, Ref } from 'react';
import { chatAssets } from './chat-assets';
import { snapshotChatBindings, snapshotChatMessages, snapshotChatProfile, validateChatRef } from './chat-data';
import type { ChatTextRenderContext, ChatTranscriptProps, ChatTranscriptScrollState } from './chat-types';
import { useClassicLayoutEffect, useClassicNodeRef } from './classic-screen-lifecycle';
import { ScrollArea } from './scroll-area';

function copyStyle(style: CSSProperties | undefined): CSSProperties {
  if (style === undefined) return {};
  if (!style || typeof style !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(style))) throw new TypeError('ChatTranscript style must be a plain CSS record');
  const result: Record<string, string | number | undefined> = {};
  for (const key of Reflect.ownKeys(style)) {
    const field = Object.getOwnPropertyDescriptor(style, key);
    if (typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key) || !field?.enumerable || !('value' in field)
      || !(field.value === undefined || typeof field.value === 'string' || typeof field.value === 'number' && Number.isFinite(field.value))) throw new TypeError('ChatTranscript style requires finite CSS data fields');
    result[key] = field.value;
  }
  for (const [key, value] of Object.entries({ width: '100%', height: '100%', minWidth: 0, minHeight: 0, overflow: 'clip' })) {
    if (result[key] !== undefined && result[key] !== value) throw new TypeError(`ChatTranscript owns style.${key}; size its parent instead`);
    result[key] = value;
  }
  if (Object.keys(result).some(key => key.startsWith('--mc-chat-') || key.startsWith('--mc-skin-scroll-') || ['--mc-scroll-edge', '--mc-scroll-thumb-edge-y'].includes(key))) throw new TypeError('ChatTranscript source metrics/material CSS variables are owned');
  return result as CSSProperties;
}

/** Pure preflight shared with Screen; no glyph callbacks, hooks or DOM reads. */
export function planChatTranscript({
  runKey, messages, bindings, profile, maxChildren, overflowPolicy, renderText, onScrollStateChange, viewportRef,
  children, dangerouslySetInnerHTML, className, style, hidden, ...native
}: ChatTranscriptProps, forwardedRef?: Ref<HTMLDivElement>) {
  if (children !== undefined || dangerouslySetInnerHTML !== undefined) throw new TypeError('ChatTranscript does not accept injected children or HTML');
  if (typeof runKey !== 'string' || !runKey.trim() || runKey.length > 256) throw new TypeError('ChatTranscript runKey must be a nonempty string of at most256 UTF16 units');
  if (hidden !== undefined && typeof hidden !== 'boolean') throw new TypeError('ChatTranscript hidden must be boolean');
  if (renderText !== undefined && typeof renderText !== 'function' || onScrollStateChange !== undefined && typeof onScrollStateChange !== 'function') throw new TypeError('ChatTranscript callbacks must be functions');
  validateChatRef(forwardedRef, 'ChatTranscript ref'); validateChatRef(viewportRef, 'ChatTranscript viewportRef');
  // Complete every snapshot and plan before entering any host glyph renderer.
  const records = snapshotChatMessages(messages, { maxChildren, overflowPolicy });
  const flags = snapshotChatBindings(bindings), presentation = snapshotChatProfile(profile), nativeStyle = copyStyle(style);
  const scale = presentation.scale;
  const font = Object.freeze({ family: presentation.fonts.chat.family,
    logicalSize: presentation.fonts.chat.logicalSize * presentation.chatFontScaleFactor,
    lineHeight: presentation.fonts.chat.lineHeight * presentation.chatFontScaleFactor + presentation.chatLinePadding });
  if (!(font.lineHeight > 0) || !Number.isFinite(font.lineHeight)) throw new RangeError('ChatTranscript effective lineHeight must be positive');
  if (native['aria-live'] !== undefined && native['aria-live'] !== presentation.messageLive) throw new TypeError('ChatTranscript aria-live must match profile.messageLive');
  const plans = Object.freeze(records.map(message => Object.freeze({ message, runs: Object.freeze((message.colorRuns ?? [{ text: message.text, color: '#ffffff' }]).map(run => Object.freeze({ text: run.text,
    context: Object.freeze({ role: 'message', font, scale, color: run.color, shadow: presentation.messageShadow, id: message.id }) satisfies ChatTextRenderContext }))) })));
  const revision = JSON.stringify([runKey, records, font, scale, presentation.messageShadow]);
  // #chat_visible belongs to every messages_text panel, not the scroller.
  const visible = !hidden;
  return Object.freeze({ runKey, flags, presentation, nativeStyle: Object.freeze(nativeStyle), scale, font, plans, revision, visible,
    native: Object.freeze(native), renderText, onScrollStateChange, viewportRef, className });
}

/** Private source leaf. The screen owns [2,23,W-2,H-50]; this leaf fills it.
 * Processed display/TTS strings are host inputs, never a profanity/TTS service. */
export const ChatTranscript = forwardRef<HTMLDivElement, ChatTranscriptProps>(function ChatTranscript(input, forwardedRef) {
  const { runKey, flags, presentation, nativeStyle, scale, font, plans, revision, visible, native, renderText, onScrollStateChange, viewportRef, className } = planChatTranscript(input, forwardedRef);
  const [root, attachRoot] = useClassicNodeRef(forwardedRef), [viewport, attachViewport] = useClassicNodeRef(viewportRef);
  const committed = useRef({ runKey, visible, onScrollStateChange });
  const previous = useRef<ChatTranscriptScrollState | null>(null);
  useClassicLayoutEffect(() => { committed.current = { runKey, visible, onScrollStateChange }; });
  const report = useCallback(() => {
    const node = viewport.current, boundary = root.current, current = committed.current;
    if (!current.visible || !node?.isConnected || !boundary?.isConnected || !boundary.contains(node) || boundary.closest('[hidden],[inert]')) return;
    const maxScrollTop = Math.max(0, node.scrollHeight - node.clientHeight), scrollTop = node.scrollTop;
    // One CSS pixel is a Web measurement tolerance, never the source stickiness rule.
    const next = Object.freeze({ runKey: current.runKey, scrolledToEnd: Math.abs(maxScrollTop - scrollTop) <= 1, scrollTop, maxScrollTop });
    const old = previous.current;
    if (old?.runKey === next.runKey && old.scrollTop === next.scrollTop && old.maxScrollTop === next.maxScrollTop && old.scrolledToEnd === next.scrolledToEnd) return;
    previous.current = next; current.onScrollStateChange?.(next);
  }, [root, viewport]);
  const jump = useCallback(() => {
    const node = viewport.current, boundary = root.current;
    if (!committed.current.visible || !node?.isConnected || !boundary?.contains(node) || boundary.closest('[hidden],[inert]')) return;
    node.scrollTop = node.scrollHeight; report();
  }, [root, viewport, report]);
  // Both source transcript families share the same owner-document lifecycle.
  useClassicBottomFollow(viewport,visible,runKey,revision,String(flags.chatVisible),jump,flags.forceScrollToBottom);
  const ownedStyle = { ...nativeStyle, '--mc-chat-unit': `${scale}px`, '--mc-chat-font-size': `${font.logicalSize * scale}px`,
    '--mc-chat-line-height': `${font.lineHeight * scale}px`, '--mc-chat-font-family': font.family,
    '--mc-chat-shadow': presentation.messageShadow ? `${scale}px ${scale}px 0 #3f3f3f` : 'none',
    '--mc-skin-scroll-track': `url(${JSON.stringify(chatAssets['textures/ui/ScrollRail'].url)})`,
    '--mc-skin-scroll-thumb': `url(${JSON.stringify(chatAssets['textures/ui/ScrollHandle'].url)})`,
    '--mc-scroll-edge': `${scale}px`, '--mc-scroll-thumb-edge-y': `${2 * scale}px` } as CSSProperties;
  return <div {...native} ref={attachRoot} hidden={!visible} className={['mc-chat-transcript', className].filter(Boolean).join(' ')} style={ownedStyle}
    role={native.role ?? 'log'} aria-live={presentation.messageLive} aria-relevant={native['aria-relevant'] ?? 'additions text'}
    aria-label={native['aria-label'] ?? (native['aria-labelledby'] ? undefined : 'Chat messages')}
    data-run-key={runKey} data-source-control="chat.messages_scrolling_panel" data-source-max-children="100" data-chat-visible={flags.chatVisible}
    data-jump-to-bottom-on-update="true" data-force-scroll-to-end={flags.forceScrollToBottom}>
    <ScrollArea variant="document" scale={scale} minThumbSize={5} scrollbarVisibility="always" className="mc-chat-transcript__scroll" label="Chat messages"
      viewportRef={attachViewport} viewportProps={{ onScroll: report, className: 'mc-chat-transcript__viewport' }}
      contentProps={{ className: 'mc-chat-transcript__content' }}>
      <div className="mc-chat-transcript__stack" data-source-control="chat.messages_stack_panel">
        {plans.map(({ message, runs }) => <div key={message.id} hidden={!flags.chatVisible} className="mc-chat-transcript__message" role="group" aria-label={message.ttsText}
          tabIndex={flags.messageTtsFocusEnabled ? 0 : -1} data-message-id={message.id} data-tts-text={message.ttsText}
          data-source-control="chat.message_tts_wrapper" data-tts-focus-enabled={flags.messageTtsFocusEnabled}>
          <span className="mc-chat-transcript__label" aria-hidden={renderText ? true : undefined}>
            {runs.map((run, index) => <span key={index} style={{ color: run.context.color }}>{renderText ? renderText(run.text, run.context) : run.text}</span>)}
          </span>
          {renderText && <span className="mc-chat-transcript__literal">{message.text}</span>}
        </div>)}
      </div>
    </ScrollArea>
  </div>;
});
