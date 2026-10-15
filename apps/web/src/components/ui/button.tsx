import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 ease-out select-none outline-none focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 motion-reduce:transition-none active:scale-[.975]',
  { variants: {
    variant: {
      default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md',
      soft: 'bg-secondary text-secondary-foreground hover:bg-secondary/75',
      outline: 'border border-border bg-card/85 text-foreground shadow-xs hover:border-primary/30 hover:bg-accent hover:text-accent-foreground',
      ghost: 'text-muted-foreground hover:bg-accent hover:text-foreground',
      destructive: 'bg-destructive text-white hover:bg-destructive/90',
      glass: 'border border-white/70 bg-card/70 text-foreground shadow-sm backdrop-blur-xl hover:bg-card/95 hover:shadow-md',
    },
    size: {
      default: 'h-10 rounded-xl px-4 text-sm',
      sm: 'h-9 rounded-lg px-3 text-xs',
      lg: 'h-12 rounded-2xl px-6 text-sm',
      icon: 'size-10 rounded-xl',
      'icon-sm': 'size-9 rounded-xl',
      'icon-lg': 'size-12 rounded-2xl',
    }
  }, defaultVariants:{variant:'default',size:'default'} }
);

type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

function Button({className,variant,size,type='button',...props}:ButtonProps) {
  return <button type={type} data-slot="button" className={cn(buttonVariants({variant,size}),className)} {...props}/>;
}
export {Button,buttonVariants,type ButtonProps};
