import * as React from 'react';

import { cn } from '~/lib/utils.js';

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-card text-card-foreground shadow-xs', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 p-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('font-medium leading-none', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

/**
 * Top-right action slot in a CardHeader. Added for ported blocks, which use
 * shadcn's newer Card anatomy. Positioning assumes a grid header; on this
 * Card's flex header it simply sits inline, which is the sane fallback.
 */
export function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('ml-auto self-start', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('p-4 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex items-center p-4 pt-0', className)} {...props} />;
}
