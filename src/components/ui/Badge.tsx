import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        {
          'border-transparent bg-primary/10 text-primary': variant === 'default',
          'border-transparent bg-muted text-muted-foreground': variant === 'secondary',
          'border-transparent bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400': variant === 'destructive',
          'border-border text-foreground bg-background': variant === 'outline',
          'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400': variant === 'success',
          'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400': variant === 'warning',
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };