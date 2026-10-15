import type * as React from 'react';
import { cn } from '../../lib/utils';
export function Badge({className,...props}:React.ComponentProps<'span'>) {
  return <span data-slot="badge" className={cn('inline-flex items-center gap-1.5 rounded-full border border-primary/12 bg-secondary/80 px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground',className)} {...props}/>;
}
