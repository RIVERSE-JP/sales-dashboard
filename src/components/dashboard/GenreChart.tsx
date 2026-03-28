'use client';

import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { GLASS_CARD, cardVariants, darkTooltipStyle, GENRE_COLORS } from './shared';

interface GenreRow {
  genre_code: string;
  genre_kr: string;
  total_sales: number;
  title_count: number;
}

interface GenreChartProps {
  data: GenreRow[];
}

export default function GenreChart({ data }: GenreChartProps) {
  const { formatCurrency, t } = useApp();
  const router = useRouter();

  if (data.length === 0) return null;

  const totalSales = data.reduce((s, d) => s + d.total_sales, 0);

  const pieData = data.map((d, i) => ({
    name: d.genre_kr || d.genre_code,
    value: d.total_sales,
    color: GENRE_COLORS[i % GENRE_COLORS.length],
    genre_code: d.genre_code,
  }));

  const handleClick = (genre_code: string) => {
    router.push(`/titles?genre=${encodeURIComponent(genre_code)}`);
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="show"
      className="rounded-2xl p-6"
      style={GLASS_CARD}
    >
      <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
        {t('장르별 매출', 'ジャンル別売上')}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={100}
              paddingAngle={2}
              onClick={(_, idx) => handleClick(pieData[idx].genre_code)}
              style={{ cursor: 'pointer' }}
            >
              {pieData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Pie>
            <ReTooltip
              {...darkTooltipStyle}
              formatter={(v: unknown) => [formatCurrency(Number(v ?? 0)), t('매출', '売上')]}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="space-y-2 overflow-y-auto max-h-[280px]">
          {data.map((row, i) => {
            const pct = totalSales > 0 ? ((row.total_sales / totalSales) * 100).toFixed(1) : '0';
            return (
              <div
                key={row.genre_code}
                className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                style={{ background: 'var(--color-surface)' }}
                onClick={() => handleClick(row.genre_code)}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: GENRE_COLORS[i % GENRE_COLORS.length] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {row.genre_kr || row.genre_code}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                    {row.title_count}{t('작품', '作品')} / {pct}%
                  </p>
                </div>
                <p className="text-sm font-bold shrink-0" style={{ color: 'var(--color-text-primary)' }}>
                  {formatCurrency(row.total_sales)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
