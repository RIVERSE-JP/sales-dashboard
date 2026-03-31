'use client';

import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { GLASS_CARD, cardVariants } from './shared';

interface CompanyRow {
  company_name: string;
  total_sales: number;
  title_count: number;
}

interface CompanyRankingProps {
  data: CompanyRow[];
}

export default function CompanyRanking({ data }: CompanyRankingProps) {
  const { formatCurrency, t } = useApp();

  if (data.length === 0) return null;

  const maxSales = data[0]?.total_sales ?? 1;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="show"
      className="rounded-2xl p-6"
      style={GLASS_CARD}
    >
      <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
        {t('제작사별 매출 TOP 10', '制作会社別売上 TOP 10')}
      </h2>
      <div className="space-y-2.5">
        {data.slice(0, 10).map((row, i) => {
          const barWidth = maxSales > 0 ? (row.total_sales / maxSales) * 100 : 0;
          return (
            <div key={row.company_name} className="group">
              <div className="flex items-center gap-3 mb-1">
                <span
                  className="text-sm font-bold w-6 text-center"
                  style={{ color: i < 3 ? '#a5b4fc' : 'var(--color-text-muted)' }}
                >
                  {i + 1}
                </span>
                <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {row.company_name}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {row.title_count}{t('작품', '作品')}
                </span>
                <span className="text-sm font-bold shrink-0" style={{ color: 'var(--color-text-primary)' }}>
                  {formatCurrency(row.total_sales)}
                </span>
              </div>
              <div className="ml-9 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-glass-border)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #3B6FF6, #60a5fa)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
