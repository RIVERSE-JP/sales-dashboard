import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Input                                                              */
/* ------------------------------------------------------------------ */

const inputVariants = cva(
  [
    'flex h-10 w-full rounded-md px-3 py-2',
    'text-sm text-foreground placeholder:text-muted-foreground',
    'transition-colors duration-200',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        /** Standard bordered input */
        default:
          'border border-input bg-card',
        /** Glass-style input using glassmorphism tokens */
        glass:
          'glass-card border-0 bg-[var(--glass-bg)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

type InputProps = Omit<React.ComponentPropsWithoutRef<'input'>, 'size'> &
  VariantProps<typeof inputVariants> & {
    /** Display a red ring to signal a validation error */
    error?: boolean;
  };

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, error, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        inputVariants({ variant }),
        error &&
          'border-destructive ring-1 ring-destructive focus-visible:ring-destructive',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { Input, inputVariants };
export type { InputProps };
