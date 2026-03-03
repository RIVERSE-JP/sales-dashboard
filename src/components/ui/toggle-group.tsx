import {
  createContext,
  useContext,
  type ReactNode,
  type ButtonHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface ToggleGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
  variant: 'default' | 'neu';
}

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null);

function useToggleGroup() {
  const ctx = useContext(ToggleGroupContext);
  if (!ctx) {
    throw new Error('ToggleGroupItem must be used within a ToggleGroup');
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  ToggleGroup                                                        */
/* ------------------------------------------------------------------ */

interface ToggleGroupProps {
  /** Currently active value */
  value: string;
  /** Callback when the active value changes */
  onValueChange: (value: string) => void;
  /** Visual variant */
  variant?: 'default' | 'neu';
  children: ReactNode;
  className?: string;
}

export function ToggleGroup({
  value,
  onValueChange,
  variant = 'default',
  children,
  className,
}: ToggleGroupProps) {
  return (
    <ToggleGroupContext.Provider value={{ value, onValueChange, variant }}>
      <div
        role="group"
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full p-0.5',
          variant === 'default' && 'bg-muted',
          variant === 'neu' && 'bg-[var(--color-bg-page)] neu-toggle',
          className,
        )}
      >
        {children}
      </div>
    </ToggleGroupContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  ToggleGroupItem                                                    */
/* ------------------------------------------------------------------ */

interface ToggleGroupItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  /** Value this item represents */
  value: string;
  children: ReactNode;
}

export function ToggleGroupItem({
  value,
  children,
  className,
  ...rest
}: ToggleGroupItemProps) {
  const { value: activeValue, onValueChange, variant } = useToggleGroup();
  const isActive = activeValue === value;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isActive}
      data-active={isActive}
      onClick={() => onValueChange(value)}
      className={cn(
        // Base pill shape
        'relative px-3 py-1 rounded-full text-xs font-semibold',
        'transition-all duration-200 ease-[var(--ease-premium)]',
        'cursor-pointer select-none',
        'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',

        // Default variant
        variant === 'default' && [
          isActive
            ? 'bg-primary text-white shadow-sm'
            : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-[var(--color-bg-hover)]',
        ],

        // Neumorphic variant
        variant === 'neu' && [
          isActive
            ? 'bg-primary text-white neu-toggle'
            : 'bg-transparent text-muted-foreground hover:text-foreground',
        ],

        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
