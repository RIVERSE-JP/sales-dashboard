'use client';

import { useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts';
import { getPlatformColor } from '@/utils/platformConfig';
import { useApp } from '@/context/AppContext';
import { darkTooltipStyle } from '@/lib/design-tokens';

interface TitleSales {
  title_jp: string;
  title_kr: string | null;
  total_sales: number;
}

interface Props {
  titles: TitleSales[];
  channel: string;
  topN: number;
}

export default function ParetoChart({ titles, channel, topN }: Props) {
  const { formatCurrency, t } = useApp();
  const color = getPlatformColor(channel);

  const { chartData, top3Pct } = useMemo(() => {
    const sorted = [...titles].sort((a, b) => b.total_sales - a.total_sales).slice(0, topN);
    const totalAll = titles.reduce((s, t) => s + t.total_sales, 0);
    let cumulative = 0;

    const chartData = sorted.map((item) => {
      // eslint-disable-next-line react-hooks/immutability -- accumulator pattern in useMemo is safe
      cumulative += item.total_sales;
      return {
        name: item.title_jp.length > 12 ? item.title_jp.slice(0, 12) + '...' : item.title_jp,
        fullName: item.title_jp,
        sales: item.total_sales,
        cumPct: totalAll > 0 ? Math.round((cumulative / totalAll) * 100) : 0,
      };
    });

    const top3Sales = sorted.slice(0, 3).reduce((s, t) => s + t.total_sales, 0);
    const top3Pct = totalAll > 0 ? ((top3Sales / totalAll) * 100).toFixed(1) : '0';

    return { chartData, top3Pct };
  }, [titles, topN]);

  if (chartData.length === 0) return null;

  const formatShort = (v: number) => {
    return Math.round(v).toLocaleString();
  };

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        {t(
          `상위 3개 작품이 매출의 ${top3Pct}%를 차지`,
          `上位3タイトルが売上の${top3Pct}%を占有`
        )}
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ left: 10, right: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatShort}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tick={{ fill: '#a5b4fc', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <ReTooltip
            {...darkTooltipStyle}
            formatter={(v: unknown, name: unknown) => {
              if (name === 'cumPct') return [`${v}%`, t('누적 비율', '累積比率')];
              return [formatCurrency(Number(v ?? 0)), t('매출', '売上')];
            }}
            labelFormatter={(label) => String(label)}
          />
          <Bar yAxisId="left" dataKey="sales" fill={color} fillOpacity={0.7} radius={[4, 4, 0, 0]} barSize={24} />
          <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke="#a5b4fc" strokeWidth={2} dot={{ fill: '#a5b4fc', r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
