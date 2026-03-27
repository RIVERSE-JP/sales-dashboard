import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Database, Search, Download, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Loader2, Filter,
} from 'lucide-react';
import { fetchDailySalesPage, fetchAllDailySales } from '@/lib/supabase';
import { generateDailyRawExcel } from '@/utils/dailyRawExporter';
import type { DailySale } from '@/types';
import { getPlatformBrand } from '@/utils/platformConfig';
import { PlatformBadge } from '@/components/PlatformBadge';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

// ============================================================
// Shared styles & animation variants
// ============================================================

const GLASS_CARD = {
  background: 'var(--color-glass)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid var(--color-glass-border)',
  borderRadius: '16px',
} as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

// ============================================================
// Helpers
// ============================================================

// ============================================================
// Loading Skeleton
// ============================================================

function TableSkeleton() {
  return (
    <div className="rounded-2xl p-6 animate-pulse" style={GLASS_CARD}>
      <div className="h-4 w-48 rounded skeleton-shimmer mb-6" />
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3">
          <div className="h-4 flex-1 rounded skeleton-shimmer" />
          <div className="h-4 w-20 rounded skeleton-shimmer" />
          <div className="h-4 w-24 rounded skeleton-shimmer" />
          <div className="h-4 w-20 rounded skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

const PAGE_SIZE = 50;

export function RawData() {
  const { formatCurrency, t } = useApp();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DailySale[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [downloading, setDownloading] = useState(false);

  // Filters
  const [titleSearch, setTitleSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('sale_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Platform list
  const [platformNames, setPlatformNames] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from('daily_sales_v2')
      .select('channel')
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set((data as Array<{ channel: string }>).map((r) => r.channel))].sort();
          setPlatformNames(unique);
        }
      });
  }, []);

  const loadPage = useCallback(async () => {
    setLoading(true);
    const result = await fetchDailySalesPage(page, PAGE_SIZE, {
      platform: platformFilter || undefined,
      titleSearch: titleSearch || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      sortBy,
      sortDir,
    });
    setRows(result.rows);
    setTotalCount(result.count);
    setLoading(false);
  }, [page, platformFilter, titleSearch, startDate, endDate, sortBy, sortDir]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  // Reset to page 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [platformFilter, titleSearch, startDate, endDate, sortBy, sortDir]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const allData = await fetchAllDailySales();
      await generateDailyRawExcel(allData);
    } catch (err) {
      console.error('Download error:', err);
    }
    setDownloading(false);
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  // Date range summary
  const dateRange = rows.length > 0
    ? `${rows[rows.length - 1]?.sale_date ?? ''} ~ ${rows[0]?.sale_date ?? ''}`
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center page-icon-glow"
        >
          <Database size={20} color="white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('원본 데이터', 'Raw Data')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('매출 데이터 열람 및 내보내기', '売上データ閲覧・エクスポート')}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all btn-gradient"
          style={{
            opacity: downloading ? 0.6 : 1,
          }}
        >
          {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Excel DL
        </motion.button>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
        {/* Filters */}
        <motion.div variants={cardVariants} className="rounded-2xl p-4" style={GLASS_CARD}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 w-full text-left cursor-pointer"
          >
            <Filter size={16} color="var(--color-text-secondary)" />
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>フィルター</span>
            {showFilters ? <ChevronUp size={14} color="var(--color-text-secondary)" /> : <ChevronDown size={14} color="var(--color-text-secondary)" />}
          </button>

          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4"
            >
              {/* Title search */}
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>タイトル検索</label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)' }}>
                  <Search size={14} color="var(--color-text-muted)" />
                  <input
                    type="text"
                    value={titleSearch}
                    onChange={(e) => setTitleSearch(e.target.value)}
                    placeholder="タイトル名..."
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: 'var(--color-text-primary)' }}
                  />
                </div>
              </div>

              {/* Platform */}
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>プラットフォーム</label>
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
                  style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)' }}
                >
                  <option value="">すべて</option>
                  {platformNames.map((p) => (
                    <option key={p} value={p}>{getPlatformBrand(p).nameJP || p}</option>
                  ))}
                </select>
              </div>

              {/* Start date */}
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>開始日</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
                  style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)', colorScheme: 'dark' }}
                />
              </div>

              {/* End date */}
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>終了日</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
                  style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)', colorScheme: 'dark' }}
                />
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Summary bar */}
        <motion.div variants={cardVariants} className="flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <span>{totalCount.toLocaleString()} 件 {dateRange && `| ${dateRange}`}</span>
          <span>Page {page + 1} / {Math.max(totalPages, 1)}</span>
        </motion.div>

        {/* Data table */}
        {loading ? (
          <TableSkeleton />
        ) : (
          <motion.div variants={cardVariants} className="rounded-2xl p-4 overflow-x-auto" style={GLASS_CARD}>
            <table className="w-full text-sm min-w-[700px] table-striped">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-table-border)' }}>
                  {[
                    { key: 'sale_date', label: t('날짜', '日付'), align: 'left' as const },
                    { key: 'title_jp', label: t('작품(JP)', 'タイトル(JP)'), align: 'left' as const },
                    { key: 'title_kr', label: t('작품(KR)', 'タイトル(KR)'), align: 'left' as const },
                    { key: 'channel', label: 'PF', align: 'left' as const },
                    { key: 'sales_amount', label: t('매출', '売上'), align: 'right' as const },
                    { key: 'data_source', label: t('소스', 'ソース'), align: 'center' as const },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className={`py-3 px-2 font-medium cursor-pointer select-none text-${col.align}`}
                      style={{ color: 'var(--color-text-secondary)' }}
                      onClick={() => handleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label} <SortIcon col={col.key} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--color-table-border-subtle)' }} className="hover:bg-[var(--color-glass)] transition-colors">
                      <td className="py-3 px-2 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{row.sale_date}</td>
                      <td className="py-3 px-2">
                        <p className="font-medium truncate max-w-[200px]" style={{ color: 'var(--color-text-primary)' }}>{row.title_jp}</p>
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-xs truncate max-w-[180px]" style={{ color: 'var(--color-text-muted)' }}>{row.title_kr ?? '-'}</p>
                      </td>
                      <td className="py-3 px-2">
                        <PlatformBadge name={row.channel} showName={false} size="sm" />
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {formatCurrency(row.sales_amount)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{
                            background: row.data_source === 'sokuhochi' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                            color: row.data_source === 'sokuhochi' ? '#fbbf24' : '#818cf8',
                          }}
                        >
                          {row.data_source === 'weekly_report' ? 'WR' : row.data_source === 'sokuhochi' ? '速報' : row.data_source}
                        </span>
                        {row.is_preliminary && (
                          <span className="ml-1 text-[10px] px-1 py-0.5 rounded" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                            暫定
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {rows.length === 0 && (
              <p className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>データがありません</p>
            )}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div variants={cardVariants} className="flex items-center justify-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={page === 0}
              onClick={() => setPage(Math.max(0, page - 1))}
              className="p-2 rounded-xl cursor-pointer transition-all"
              style={{
                ...GLASS_CARD,
                opacity: page === 0 ? 0.3 : 1,
              }}
            >
              <ChevronLeft size={16} color="var(--color-text-secondary)" />
            </motion.button>

            {/* Page number buttons */}
            {(() => {
              const buttons: number[] = [];
              const start = Math.max(0, page - 2);
              const end = Math.min(totalPages - 1, page + 2);
              for (let i = start; i <= end; i++) buttons.push(i);
              return buttons.map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="w-9 h-9 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                  style={{
                    background: p === page ? 'rgba(99, 102, 241, 0.2)' : 'var(--color-glass)',
                    color: p === page ? '#a5b4fc' : 'var(--color-text-muted)',
                    border: p === page ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--color-glass-border)',
                  }}
                >
                  {p + 1}
                </button>
              ));
            })()}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={page >= totalPages - 1}
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              className="p-2 rounded-xl cursor-pointer transition-all"
              style={{
                ...GLASS_CARD,
                opacity: page >= totalPages - 1 ? 0.3 : 1,
              }}
            >
              <ChevronRight size={16} color="var(--color-text-secondary)" />
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
