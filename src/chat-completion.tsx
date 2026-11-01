import { forwardRef } from 'react';
import type { CSSProperties, HTMLAttributes, Ref, SyntheticEvent } from 'react';
import { ClassicSkin } from './classic-skin';
import { Image } from './image';
import { chatAssets } from './chat-assets';
import { ChatGlyph } from './chat-text';
import { snapshotChatGridDimensions, snapshotChatProfile, snapshotChatSuggestions, validateChatRef } from './chat-data';
import type { ChatPresentationProfile, ChatSize, ChatSuggestion, ChatTextRenderer } from './chat-types';
import { useClassicNodeRef } from './classic-screen-lifecycle';

export interface ChatCompletionRequest {
  readonly target: 'button.click_autocomplete'; readonly control: HTMLButtonElement;
  readonly event: SyntheticEvent<HTMLButtonElement>;
  readonly suggestion: { readonly id: string; readonly index: number; readonly itemIdAux: unknown };
}
export interface ChatCompletionListProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML'> {
  readonly children?: never; readonly dangerouslySetInnerHTML?: never;
  readonly suggestions: readonly ChatSuggestion[]; readonly dimensions: ChatSize;
  readonly profile: ChatPresentationProfile; readonly disabled?: boolean; readonly readOnly?: boolean;
  readonly renderText?: ChatTextRenderer; readonly onRequest: (detail: ChatCompletionRequest) => void | false;
}

/** Shared with the screen's all-leaf preflight. No callbacks, hooks or IO. */
export function planChatCompletionList(props: ChatCompletionListProps, forwardedRef?: Ref<HTMLDivElement>) {
  const { suggestions: source, dimensions: sourceDimensions, profile: sourceProfile, disabled = false, readOnly = false,
    renderText, onRequest, children, dangerouslySetInnerHTML } = props;
  if (children !== undefined || dangerouslySetInnerHTML !== undefined) throw new TypeError('Chat completion content is data-driven.');
  if (typeof disabled !== 'boolean' || typeof readOnly !== 'boolean') throw new TypeError('Chat completion flags must be boolean.');
  if (typeof onRequest !== 'function' || renderText !== undefined && typeof renderText !== 'function') throw new TypeError('Invalid Chat completion callback.');
  validateChatRef(forwardedRef, 'Chat completion ref');
  const profile = snapshotChatProfile(sourceProfile), suggestions = snapshotChatSuggestions(source, sourceDimensions);
  const dimensions = snapshotChatGridDimensions(sourceDimensions, suggestions.length), s = profile.scale;
  const width = profile.availableSize[0], rows = dimensions[1], columns = dimensions[0];
  if (rows * 10 * s > 8192 || width * rows * 10 * s * s > 4194304)
    throw new RangeError('Chat completion exceeds the finite Web grid extent budget.');
  return Object.freeze({ profile, suggestions, dimensions, s, width, rows, columns, disabled, readOnly, renderText, onRequest });
}

/** Source rows keep the item and text at the SAME two-unit left offset.
 * Non-suggestion rows retain their content; only their click surface is absent.
 * The parent owns the commands panel's bottom anchor and available extent. */
export const ChatCompletionList = forwardRef<HTMLDivElement, ChatCompletionListProps>(function ChatCompletionList({
  suggestions: source, dimensions: sourceDimensions, profile: sourceProfile, disabled = false, readOnly = false,
  renderText, onRequest, children, dangerouslySetInnerHTML, className = '', style, ...native
}, forwardedRef) {
  const { profile, suggestions, s, width, rows, columns } = planChatCompletionList({ suggestions: source,
    dimensions: sourceDimensions, profile: sourceProfile, disabled, readOnly, renderText, onRequest, children, dangerouslySetInnerHTML }, forwardedRef);
  const [node, attach] = useClassicNodeRef(forwardedRef);
  return <div {...native} ref={attach} className={`mc-chat-completion ${className}`}
    data-source-control="chat.auto_complete_panel" data-web-grid-policy="finite-parent-equal-columns"
    style={{ ...style, '--mc-chat-unit': `${s}px`, width: '100%', height: rows * 10 * s,
      gridTemplateColumns: columns ? `repeat(${columns}, minmax(0, 1fr))` : 'none',
      gridTemplateRows: rows ? `repeat(${rows}, ${10 * s}px)` : 'none', gridAutoFlow: 'column' } as CSSProperties}>
    {suggestions.map((suggestion, index) => {
      const item = suggestion.itemVisual;
      const graphic = item.kind === 'host-item-renderer'
        ? item.render(Object.freeze({ size: Object.freeze([9, 9] as const), scale: s, itemIdAux: suggestion.itemIdAux }))
        : item.kind === 'whole-image' ? <Image src={item.image.src} sourceSize={item.image.naturalSize} alt="" style={{ width: 9 * s, height: 9 * s }} /> : null;
      return <div key={suggestion.id} className="mc-chat-completion__row" data-suggestion-id={suggestion.id} data-is-suggestion={suggestion.isSuggestion}>
        <span aria-hidden="true" className="mc-chat-completion__item">{graphic}</span>
        <span className="mc-chat-completion__text" aria-hidden={suggestion.isSuggestion || undefined}><ChatGlyph text={suggestion.text} role="suggestion" profile={profile} renderText={renderText} /></span>
        {suggestion.isSuggestion && <button type="button" className="mc-chat-completion__button" disabled={disabled} aria-disabled={readOnly || undefined}
          aria-label={suggestion.text} data-source-target="button.click_autocomplete" data-suggestion-id={suggestion.id}
          onClick={event => {
            const control = event.currentTarget;
            if (readOnly || disabled || event.defaultPrevented || event.nativeEvent.defaultPrevented
              || !node.current?.contains(control) || control.closest('[hidden],[inert]')) return;
            onRequest(Object.freeze({ target: 'button.click_autocomplete', control, event,
              suggestion: Object.freeze({ id: suggestion.id, index, itemIdAux: suggestion.itemIdAux }) }));
          }}>
          <span className="mc-chat-completion__focus"><ClassicSkin asset={chatAssets['textures/ui/square_image_border_white']}
            width={columns ? width / columns : width} height={10} scale={s} baseClass="mc-chat-skin" errorName="Chat" /></span>
        </button>}
      </div>;
    })}
  </div>;
});
