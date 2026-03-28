'use client';

import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell } from 'recharts';
import { useApp } from '@/context/AppContext';
import { GLASS_CARD, cardVariants, darkTooltipStyle, FORMAT_COLORS, formatShort } from './shared';

interface FormatRow {
  content_format: string;
  total_sales: number;
  title_count: number;
}

interface FormatChartProps {
  data: FormatRow[];
}

export default function FormatChart({ data }: FormatChartProps) {
  const { formatCurrency, t } = useApp();

  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    name: d.content_format,
    sales: d.total_sales,
    titles: d.title_count,
    color: FORMAT_COLORS[d.content_format] ?? '#818cf8',
  }));

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="show"
      className="rounded-2xl p-6"
      style={GLASS_CARD}
    >
      <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
        {t('콘텐츠 포맷별 매출', 'コンテンツフォーマット別売上')}
      </h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatShort}
            width={60}
          />
          <ReTooltip
            {...darkTooltipStyle}
            formatter={(v: unknown) => [formatCurrency(Number(v ?? 0)), t('매출', '売上')]}
          />
          <Bar dataKey="sales" radius={[8, 8, 0, 0]} barSize={60}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3 justify-center">
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
            {d.name}: {d.titles}{t('작품', '作品')}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
