// Shared styles, animation variants, and helpers for Dashboard components

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

export const GENRE_COLORS = [
  '#818cf8', '#f472b6', '#34d399', '#fbbf24', '#fb923c',
  '#a78bfa', '#38bdf8', '#f87171', '#4ade80', '#e879f9',
  '#22d3ee', '#facc15',
];

export const FORMAT_COLORS: Record<string, string> = {
  WEBTOON: '#818cf8',
  PAGETOON: '#f472b6',
  NOVEL: '#34d399',
};

export function formatShort(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}`;
  return value.toLocaleString();
}
