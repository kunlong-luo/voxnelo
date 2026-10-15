import { type ReactNode } from 'react';

/** Unified app tooltip. Never uses the browser-native HTML title tooltip.
 * CSS hover / focus-within, Escape-free because it never traps input or focus.
 */
export function Tooltip({text, children, placement = 'top'}:
  {text: string; children: ReactNode; placement?: 'top' | 'bottom'}) {
  return (
    <span className={'uiTooltip placement-' + placement}>
      {children}
      <span className="uiTooltipBubble" role="tooltip">{text}</span>
    </span>
  );
}
