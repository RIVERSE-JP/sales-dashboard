import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

/* ------------------------------------------------------------------ */
/*  ChartCard                                                          */
/* ------------------------------------------------------------------ */

interface ChartCardProps {
  /** Chart / section title */
  title: string;
  /** Optional descriptive subtitle */
  subtitle?: string;
  /** Optional action slot rendered in the top-right corner (e.g. toggle, button) */
  action?: ReactNode;
  /** Chart content */
  children: ReactNode;
  /** Visual variant forwarded to Card */
  variant?: 'default' | 'glass';
  /** Additional classes on the outer wrapper */
  className?: string;
}

/**
 * Reusable chart container that provides consistent layout, title area,
 * and a framer-motion fade-in entrance animation.
 */
export function ChartCard({
  title,
  subtitle,
  action,
  children,
  variant = 'default',
  className,
}: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn('h-full', className)}
    >
      <Card variant={variant} className="h-full flex flex-col">
        {/* Header area: title + optional action */}
        <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex flex-col space-y-1">
            <CardTitle>{title}</CardTitle>
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </div>
          {action && (
            <div className="flex-shrink-0 ml-4">{action}</div>
          )}
        </CardHeader>

        {/* Chart content area */}
        <CardContent className="flex-1 min-h-0">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}
