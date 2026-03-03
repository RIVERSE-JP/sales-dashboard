import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Card                                                               */
/* ------------------------------------------------------------------ */

const cardVariants = cva(
  'rounded-lg text-card-foreground transition-all duration-300',
  {
    variants: {
      variant: {
        /** Matches the `.card-premium` pattern from index.css */
        default:
          'bg-card border border-border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]',
        /** Uses the `.glass-card` CSS class */
        glass: 'glass-card rounded-lg',
        /** Higher elevation with stronger shadow */
        elevated:
          'bg-card border border-border shadow-[var(--shadow-elevated)] hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

type CardProps = React.ComponentPropsWithoutRef<'div'> &
  VariantProps<typeof cardVariants>;

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

/* ------------------------------------------------------------------ */
/*  CardHeader                                                         */
/* ------------------------------------------------------------------ */

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

/* ------------------------------------------------------------------ */
/*  CardTitle                                                          */
/* ------------------------------------------------------------------ */

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight text-foreground',
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

/* ------------------------------------------------------------------ */
/*  CardDescription                                                    */
/* ------------------------------------------------------------------ */

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<'p'>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

/* ------------------------------------------------------------------ */
/*  CardContent                                                        */
/* ------------------------------------------------------------------ */

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

/* ------------------------------------------------------------------ */
/*  CardFooter                                                         */
/* ------------------------------------------------------------------ */

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
