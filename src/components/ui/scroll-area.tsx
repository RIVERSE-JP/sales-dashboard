import * as React from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  ScrollArea                                                         */
/* ------------------------------------------------------------------ */

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum height of the scrollable container (CSS value, e.g. "400px") */
  maxHeight?: string;
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ maxHeight, className, style, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-auto',
          // Custom thin scrollbar (matches global 6px style)
          '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5',
          '[&::-webkit-scrollbar-track]:bg-transparent',
          '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#CBD5E1]',
          '[&::-webkit-scrollbar-thumb:hover]:bg-[#94A3B8]',
          className,
        )}
        style={{
          maxHeight,
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E1 transparent',
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  },
);
ScrollArea.displayName = 'ScrollArea';

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { ScrollArea };
