import { type ReactNode, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Tooltip (CSS-only hover)                                           */
/* ------------------------------------------------------------------ */

type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps extends HTMLAttributes<HTMLDivElement> {
  /** Text content shown inside the tooltip bubble */
  content: string;
  /** The element that triggers the tooltip on hover */
  children: ReactNode;
  /** Placement relative to the trigger element */
  side?: TooltipSide;
  /** Delay in ms before the tooltip becomes visible (CSS transition-delay) */
  delayMs?: number;
}

/**
 * Positional styles for each placement side.
 * Each value contains the absolute positioning classes plus the
 * entry-transform origin so the tooltip "grows" from the correct edge.
 */
const sideStyles: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

/**
 * Arrow (caret) styles per side. Uses transparent-border trick.
 */
const arrowStyles: Record<TooltipSide, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-[color:var(--glass-bg-strong)] border-x-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[color:var(--glass-bg-strong)] border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-[color:var(--glass-bg-strong)] border-y-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-[color:var(--glass-bg-strong)] border-y-transparent border-l-transparent',
};

export function Tooltip({
  content,
  children,
  side = 'top',
  delayMs = 200,
  className,
  ...rest
}: TooltipProps) {
  return (
    <div
      className={cn('relative inline-flex group', className)}
      {...rest}
    >
      {children}

      {/* Tooltip bubble */}
      <div
        role="tooltip"
        className={cn(
          // Position
          'absolute z-50 pointer-events-none',
          sideStyles[side],
          // Appearance: glassmorphism
          'px-3 py-1.5 rounded-lg',
          'bg-[var(--glass-bg-strong)] backdrop-blur-[var(--glass-blur)]',
          'border border-[var(--glass-border)]',
          'shadow-[var(--shadow-elevated)]',
          // Text
          'text-xs font-medium text-foreground whitespace-nowrap',
          // Visibility & transition
          'opacity-0 scale-95',
          'group-hover:opacity-100 group-hover:scale-100',
          'transition-[opacity,transform]',
          'duration-200 ease-[var(--ease-premium)]',
        )}
        style={{ transitionDelay: `${delayMs}ms` }}
      >
        {content}

        {/* Arrow */}
        <span
          aria-hidden
          className={cn(
            'absolute w-0 h-0 border-[5px]',
            arrowStyles[side],
          )}
        />
      </div>
    </div>
  );
}
