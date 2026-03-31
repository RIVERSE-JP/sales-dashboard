// Shared styles, animation variants, and helpers for Dashboard components

export { GLASS_CARD, GLASS_CARD_HOVER, darkTooltipStyle, containerVariants, cardVariants } from '@/lib/design-tokens';

export const GENRE_COLORS = [
  '#3B6FF6', '#f472b6', '#34d399', '#fbbf24', '#fb923c',
  '#a78bfa', '#38bdf8', '#f87171', '#4ade80', '#e879f9',
  '#22d3ee', '#facc15',
];

export const FORMAT_COLORS: Record<string, string> = {
  WEBTOON: '#3B6FF6',
  PAGETOON: '#f472b6',
  NOVEL: '#34d399',
};

export function formatShort(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}`;
  return value.toLocaleString();
}
