import { createElement, forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shadow?: boolean;
}
export const Text = forwardRef<HTMLElement, TextProps>(function Text({ as = 'span', size = 'md', shadow = true, className, ...props }, ref) {
  return createElement(as, { ...props, ref, className: ['mc-text', `mc-text--${size}`, !shadow && 'mc-text--no-shadow', className].filter(Boolean).join(' ') });
});
