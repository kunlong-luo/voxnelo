import * as React from 'react';
import { cn } from '../../lib/utils';

export function Card({className,...props}:React.ComponentProps<'section'>) {
  return <section data-slot="card" className={cn(
    'min-w-0 rounded-[var(--radius)] border border-border/70 bg-card/85 text-card-foreground shadow-[0_18px_55px_-30px_var(--shadow-color)] backdrop-blur-xl',
    className
  )} {...props}/>;
}
export function CardHeader({className,...props}:React.ComponentProps<'header'>) {
  return <header data-slot="card-header" className={cn('flex items-center justify-between gap-3 p-5 sm:p-6',className)} {...props}/>;
}
export function CardContent({className,...props}:React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-5 pb-5 sm:px-6 sm:pb-6',className)} {...props}/>;
}
export function CardFooter({className,...props}:React.ComponentProps<'footer'>) {
  return <footer data-slot="card-footer" className={cn('flex items-center gap-3 border-t border-border/60 px-5 py-4 sm:px-6',className)} {...props}/>;
}
export function CardTitle({className,...props}:React.ComponentProps<'h2'>) {
  return <h2 data-slot="card-title" className={cn('text-sm font-bold tracking-[-.02em]',className)} {...props}/>;
}
