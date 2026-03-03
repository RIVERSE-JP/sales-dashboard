import * as React from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error('Tabs compound components must be used within <Tabs>');
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Tabs (root container)                                              */
/* ------------------------------------------------------------------ */

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ defaultValue, value, onValueChange, className, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue);

    const activeTab = value ?? internalValue;
    const setActiveTab = React.useCallback(
      (next: string) => {
        if (value === undefined) {
          setInternalValue(next);
        }
        onValueChange?.(next);
      },
      [value, onValueChange],
    );

    const ctx = React.useMemo(
      () => ({ activeTab, setActiveTab }),
      [activeTab, setActiveTab],
    );

    return (
      <TabsContext.Provider value={ctx}>
        <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  },
);
Tabs.displayName = 'Tabs';

/* ------------------------------------------------------------------ */
/*  TabsList                                                           */
/* ------------------------------------------------------------------ */

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'neumorphic';
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ variant = 'default', className, ...props }, ref) => {
    const variantClasses: Record<string, string> = {
      default: 'bg-muted',
      glass: [
        'bg-[var(--glass-bg)]',
        'backdrop-blur-[var(--glass-blur)]',
        'border border-[var(--glass-border)]',
        'shadow-[var(--glass-shadow)]',
      ].join(' '),
      neumorphic: 'bg-muted shadow-[var(--neu-shadow-outset)]',
    };

    return (
      <div
        ref={ref}
        role="tablist"
        className={cn(
          'inline-flex items-center gap-1 rounded-lg p-1',
          variantClasses[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
TabsList.displayName = 'TabsList';

/* ------------------------------------------------------------------ */
/*  TabsTrigger                                                        */
/* ------------------------------------------------------------------ */

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, className, children, ...props }, ref) => {
    const { activeTab, setActiveTab } = useTabsContext();
    const isActive = activeTab === value;

    return (
      <button
        ref={ref}
        role="tab"
        type="button"
        aria-selected={isActive}
        data-state={isActive ? 'active' : 'inactive'}
        onClick={() => setActiveTab(value)}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5',
          'text-sm font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          isActive
            ? 'bg-primary text-white shadow-sm'
            : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
TabsTrigger.displayName = 'TabsTrigger';

/* ------------------------------------------------------------------ */
/*  TabsContent                                                        */
/* ------------------------------------------------------------------ */

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, className, children, ...props }, ref) => {
    const { activeTab } = useTabsContext();

    if (activeTab !== value) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        data-state="active"
        className={cn(
          'mt-2 animate-fade-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className,
        )}
        tabIndex={0}
        {...props}
      >
        {children}
      </div>
    );
  },
);
TabsContent.displayName = 'TabsContent';

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { Tabs, TabsList, TabsTrigger, TabsContent };
