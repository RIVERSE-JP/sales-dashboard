import { useEffect, useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useInView,
} from 'framer-motion';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  AnimatedNumber                                                     */
/* ------------------------------------------------------------------ */

interface SpringConfig {
  stiffness: number;
  damping: number;
  restDelta?: number;
}

interface AnimatedNumberProps {
  /** Target numeric value to animate towards */
  value: number;
  /**
   * Formatter applied to the animated number on every frame.
   * Defaults to `(n) => n.toLocaleString()`.
   */
  formatter?: (value: number) => string;
  /** Spring physics configuration */
  duration?: SpringConfig;
  /** Additional class names on the wrapping <span> */
  className?: string;
}

const defaultSpring: SpringConfig = {
  stiffness: 60,
  damping: 25,
  restDelta: 0.01,
};

const defaultFormatter = (n: number): string => n.toLocaleString();

/**
 * Animated counting number that springs from 0 to `value` when
 * the element enters the viewport.
 *
 * Extracted from the KPICard AnimatedValue pattern so it can be
 * reused across the dashboard.
 */
export function AnimatedNumber({
  value,
  formatter = defaultFormatter,
  duration = defaultSpring,
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, {
    stiffness: duration.stiffness,
    damping: duration.damping,
    restDelta: duration.restDelta ?? 0.01,
  });

  const display = useTransform(springVal, (latest: number) =>
    formatter(latest),
  );

  useEffect(() => {
    if (isInView) {
      motionVal.set(value);
    }
  }, [isInView, value, motionVal]);

  return (
    <motion.span ref={ref} className={cn(className)}>
      {display}
    </motion.span>
  );
}
