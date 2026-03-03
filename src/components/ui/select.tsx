import * as React from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Select (native HTML select)                                        */
/* ------------------------------------------------------------------ */

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, placeholder, children, defaultValue, ...props }, ref) => {
    return (
      <select
        ref={ref}
        defaultValue={defaultValue ?? (placeholder ? '' : undefined)}
        className={cn(
          'flex h-9 w-full appearance-none rounded-md border border-border',
          'bg-card px-3 py-1.5 pr-8 text-sm text-foreground',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          // caret icon via inline SVG background
          'bg-[length:16px_16px] bg-[position:right_8px_center] bg-no-repeat',
          'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")]',
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {children}
      </select>
    );
  },
);
Select.displayName = 'Select';

/* ------------------------------------------------------------------ */
/*  SelectOption (convenience wrapper)                                 */
/* ------------------------------------------------------------------ */

const SelectOption = React.forwardRef<
  HTMLOptionElement,
  React.OptionHTMLAttributes<HTMLOptionElement>
>(({ className, ...props }, ref) => (
  <option ref={ref} className={cn('text-foreground', className)} {...props} />
));
SelectOption.displayName = 'SelectOption';

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { Select, SelectOption };
