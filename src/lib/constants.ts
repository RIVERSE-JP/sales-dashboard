// ---------------------------------------------------------------------------
// Shared constants - extracted from duplicated patterns across pages
// ---------------------------------------------------------------------------

/** Chart color palette (matches @theme --color-chart-1..10) */
export const CHART_COLORS = [
  '#2563EB', '#7C3AED', '#0891B2', '#16A34A', '#D97706',
  '#DC2626', '#DB2777', '#0D9488', '#4F46E5', '#EA580C',
] as const;

/** Shared Recharts tooltip styles */
export const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
    padding: '12px 16px',
  },
  labelStyle: {
    color: '#475569',
    fontWeight: 600,
    fontSize: '13px',
  },
  itemStyle: {
    color: '#0F172A',
    fontWeight: 700,
  },
} as const;

// ---------------------------------------------------------------------------
// Framer-motion animation variants
// ---------------------------------------------------------------------------

/** Stagger container (parent) */
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

/** Stagger item (child) - slide up */
export const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

/** Chart reveal animation */
export const chartReveal = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

/** Card hover effect (enhanced) */
export const cardHover = {
  y: -4,
  scale: 1.015,
  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

/** Premium easing for framer-motion */
export const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;
