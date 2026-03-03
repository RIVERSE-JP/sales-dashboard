import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Badge                                                              */
/* ------------------------------------------------------------------ */

const badgeVariants = cva(
  [
    'inline-flex items-center',
    'rounded-full border px-2.5 py-0.5',
    'text-xs font-semibold',
    'transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  ].join(' '),
  {
    variants: {
      variant: {
        /** Default -- primary accent */
        default:
          'border-transparent bg-accent text-white',
        /** Secondary -- muted, subtle */
        secondary:
          'border-transparent bg-muted text-muted-foreground',
        /** Destructive / error */
        destructive:
          'border-transparent bg-destructive text-white',
        /** Outline-only */
        outline:
          'border-border text-foreground',
        /** Success -- green */
        success:
          'border-transparent bg-[var(--color-success-light)] text-[var(--color-success)]',
        /** Warning -- amber */
        warning:
          'border-transparent bg-[var(--color-warning-light)] text-[var(--color-warning)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

type BadgeProps = React.ComponentPropsWithoutRef<'div'> &
  VariantProps<typeof badgeVariants>;

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  ),
);
Badge.displayName = 'Badge';

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { Badge, badgeVariants };
export type { BadgeProps };
