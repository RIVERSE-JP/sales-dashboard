export { GLASS_CARD, darkTooltipStyle, containerVariants, cardVariants } from '@/lib/design-tokens';

export const SERIAL_STATUSES = ['連載中', '完結', '休載中', '未連載'] as const;
export const CONTENT_FORMATS = ['WEBTOON', 'PAGETOON', 'NOVEL'] as const;
export const SALES_PRESETS = ['all', 'top10', 'top50', 'bottom50'] as const;
export type SalesPreset = (typeof SALES_PRESETS)[number];

export const COMPARE_COLORS = ['#3B6FF6', '#f472b6', '#34d399', '#fbbf24', '#f87171'];
