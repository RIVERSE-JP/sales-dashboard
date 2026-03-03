import * as React from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Separator                                                          */
/* ------------------------------------------------------------------ */

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    { orientation = 'horizontal', decorative = true, className, ...props },
    ref,
  ) => {
    const isHorizontal = orientation === 'horizontal';

    return (
      <div
        ref={ref}
        role={decorative ? 'none' : 'separator'}
        aria-orientation={decorative ? undefined : orientation}
        className={cn(
          'shrink-0 bg-border',
          isHorizontal ? 'h-px w-full' : 'h-full w-px',
          className,
        )}
        {...props}
      />
    );
  },
);
Separator.displayName = 'Separator';

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { Separator };
