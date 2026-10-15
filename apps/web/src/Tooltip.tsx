import type { ReactElement } from 'react';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';

/** Base UI tooltip uses collision-aware portal positioning (not native title).
 * Trigger remains the original focusable button, including Electron controls.
 */
export function Tooltip({text,children,placement='top'}:{
  text:string;
  children:ReactElement;
  placement?:'top'|'bottom';
}) {
  return <BaseTooltip.Provider delay={180}>
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children}/>
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={placement} sideOffset={9} collisionPadding={12}>
          <BaseTooltip.Popup className="uiTooltipBubble z-[100] max-w-60 rounded-xl border border-white/10 bg-popover px-3 py-2 text-xs font-medium text-popover-foreground shadow-xl outline-none transition-[opacity,transform] duration-150 ease-out data-[starting-style]:translate-y-1 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none">
            {text}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  </BaseTooltip.Provider>;
}
