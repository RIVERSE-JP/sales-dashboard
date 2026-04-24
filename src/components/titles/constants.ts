export { GLASS_CARD, darkTooltipStyle, containerVariants, cardVariants } from '@/lib/design-tokens';

export const SERIAL_STATUSES = ['連載中', '完結', '休載中', '未連載'] as const;
export const CONTENT_FORMATS = ['WEBTOON', 'PAGETOON', 'NOVEL'] as const;
export const SALES_PRESETS = ['all', 'top10', 'top50', 'bottom50'] as const;
export type SalesPreset = (typeof SALES_PRESETS)[number];

export const COMPARE_COLORS = [
  '#3B6FF6', // blue
  '#f472b6', // pink
  '#34d399', // emerald
  '#fbbf24', // amber
  '#f87171', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#64748b', // slate
];
