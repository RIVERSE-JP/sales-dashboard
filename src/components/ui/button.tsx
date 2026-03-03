import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Button                                                             */
/* ------------------------------------------------------------------ */

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md text-sm font-medium',
    'transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.97]',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        /** Primary navy button */
        default:
          'bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow-md',
        /** Lighter secondary button */
        secondary:
          'bg-muted text-foreground hover:bg-[var(--color-bg-hover)]',
        /** Border-only outline */
        outline:
          'border border-border bg-transparent text-foreground hover:bg-muted hover:text-foreground',
        /** Minimal ghost button */
        ghost:
          'bg-transparent text-foreground hover:bg-muted hover:text-foreground',
        /** Destructive / danger */
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 shadow-sm',
        /** Neumorphic raised style */
        neumorphic:
          'neu-raised bg-[var(--color-bg-page)] text-foreground hover:text-accent active:shadow-[var(--neu-shadow-pressed)]',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-md',
        default: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 text-base rounded-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonProps = React.ComponentPropsWithoutRef<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Render as a child element (Slot pattern) -- kept for future Radix usage */
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild: _asChild, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { Button, buttonVariants };
export type { ButtonProps };
