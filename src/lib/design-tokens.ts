// Shared design tokens and style constants used across all pages

export const GLASS_CARD = {
  background: 'var(--color-glass)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid var(--color-glass-border)',
  borderRadius: '16px',
} as const;

export const GLASS_CARD_HOVER = {
  background: 'var(--color-glass-hover)',
  border: '1px solid var(--color-glass-hover-border)',
} as const;

export const darkTooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--color-tooltip-bg)',
    border: '1px solid var(--color-tooltip-border)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
    padding: '14px 18px',
  },
  labelStyle: {
    color: 'var(--color-tooltip-label)',
    fontWeight: 600,
    fontSize: '12px',
    marginBottom: '6px',
  },
  itemStyle: {
    color: 'var(--color-tooltip-value)',
    fontWeight: 700,
    fontSize: '14px',
  },
};

export const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

export const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.2 },
  },
};
