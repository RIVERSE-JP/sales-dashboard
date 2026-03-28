export const GLASS_CARD = {
  background: 'var(--color-glass)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid var(--color-glass-border)',
  borderRadius: '16px',
} as const;

export const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

export const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export const darkTooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--color-tooltip-bg)',
    border: '1px solid var(--color-tooltip-border)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
    padding: '14px 18px',
  },
  labelStyle: { color: 'var(--color-tooltip-label)', fontWeight: 600, fontSize: '12px', marginBottom: '6px' },
  itemStyle: { color: 'var(--color-tooltip-value)', fontWeight: 700, fontSize: '14px' },
};

export const SERIAL_STATUSES = ['連載中', '完結', '休載中', '未連載'] as const;
export const CONTENT_FORMATS = ['WEBTOON', 'PAGETOON', 'NOVEL'] as const;
export const SALES_PRESETS = ['all', 'top10', 'top50', 'bottom50'] as const;
export type SalesPreset = (typeof SALES_PRESETS)[number];

export const COMPARE_COLORS = ['#818cf8', '#f472b6', '#34d399', '#fbbf24', '#f87171'];
