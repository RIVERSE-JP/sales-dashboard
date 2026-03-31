'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Search, Download, Loader2, Calendar,
  CheckSquare, Square, X, ChevronDown, ChevronUp,
  BarChart3,
} from 'lucide-react';
import { fetchAllDailySales } from '@/lib/supabase';
import {
  generateWeeklyReport,
  generateCSV,
} from '@/utils/reportExporter';
import type { DailySale } from '@/types';
import { PlatformBadge } from '@/components/PlatformBadge';
import { useApp } from '@/context/AppContext';

// ============================================================
// Shared styles
// ============================================================

const GLASS_CARD = {
  background: 'var(--color-glass)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid var(--color-glass-border)',
  borderRadius: '16px',
} as const;

// ============================================================
// Date preset helpers
// ============================================================

function getDatePreset(key: string): { start: string; end: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  switch (key) {
    case 'this_week': {
      const d = new Date(today);
      d.setDate(d.getDate() - d.getDay() + 1);
      return { start: fmt(d), end: fmt(today) };
    }
    case 'last_week': {
      const d = new Date(today);
      d.setDate(d.getDate() - d.getDay() - 6);
      const e = new Date(d);
      e.setDate(e.getDate() + 6);
      return { start: fmt(d), end: fmt(e) };
    }
    case 'this_month': {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: fmt(d), end: fmt(today) };
    }
    case 'last_month': {
      const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const e = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: fmt(d), end: fmt(e) };
    }
    case '3months': {
      const d = new Date(today);
      d.setMonth(d.getMonth() - 3);
      return { start: fmt(d), end: fmt(today) };
    }
    case 'this_year': {
      return { start: `${today.getFullYear()}-01-01`, end: fmt(today) };
    }
    default:
      return { start: '', end: '' };
  }
}

const DATE_PRESETS = [
  { key: 'this_week', ko: '이번 주', ja: '今週' },
  { key: 'last_week', ko: '지난 주', ja: '先週' },
  { key: 'this_month', ko: '이번 달', ja: '今月' },
  { key: 'last_month', ko: '지난 달', ja: '先月' },
  { key: '3months', ko: '3개월', ja: '3ヶ月' },
  { key: 'this_year', ko: '올해', ja: '今年' },
];

// ============================================================
// Main Component
// ============================================================

export default function ReportsPage() {
  const { formatCurrency, t, theme } = useApp();

  // All data
  const [allData, setAllData] = useState<DailySale[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activePreset, setActivePreset] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [selectedTitles, setSelectedTitles] = useState<Set<string>>(new Set());
  const [titleSearch, setTitleSearch] = useState('');
  const [platformOpen, setPlatformOpen] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);

  const [downloading, setDownloading] = useState(false);

  // Unique values
  const platforms = useMemo(() => {
    const set = new Set<string>();
    allData.forEach((r) => set.add(r.channel));
    return [...set].sort();
  }, [allData]);

  const allTitles = useMemo(() => {
    const map = new Map<string, string | null>();
    allData.forEach((r) => { if (!map.has(r.title_jp)) map.set(r.title_jp, r.title_kr); });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [allData]);

  const filteredTitles = useMemo(() => {
    if (!titleSearch) return allTitles.slice(0, 100);
    const q = titleSearch.toLowerCase();
    return allTitles.filter(([jp, kr]) =>
      jp.toLowerCase().includes(q) || (kr && kr.toLowerCase().includes(q)),
    ).slice(0, 100);
  }, [allTitles, titleSearch]);

  // Filtered data
  const filteredData = useMemo(() => {
    let d = allData;
    if (startDate) d = d.filter((r) => r.sale_date >= startDate);
    if (endDate) d = d.filter((r) => r.sale_date <= endDate);
    if (selectedPlatforms.size > 0) d = d.filter((r) => selectedPlatforms.has(r.channel));
    if (selectedTitles.size > 0) d = d.filter((r) => selectedTitles.has(r.title_jp));
    return d;
  }, [allData, startDate, endDate, selectedPlatforms, selectedTitles]);

  // Summary stats
  const totalSales = useMemo(() => filteredData.reduce((s, r) => s + r.sales_amount, 0), [filteredData]);
  const uniqueTitles = useMemo(() => new Set(filteredData.map((r) => r.title_jp)).size, [filteredData]);
  const uniquePlatforms = useMemo(() => new Set(filteredData.map((r) => r.channel)).size, [filteredData]);

  // Preview data (top 100)
  const previewData = useMemo(() => {
    const sorted = [...filteredData].sort((a, b) => b.sale_date.localeCompare(a.sale_date));
    return sorted.slice(0, 100);
  }, [filteredData]);

  // Load all data on mount
  useEffect(() => {
    (async () => {
      setLoadingData(true);
      try {
        const data = await fetchAllDailySales();
        setAllData(data);
      } catch (err) {
        console.error('Failed to load data:', err);
      }
      setLoadingData(false);
    })();
  }, []);

  // Date preset handler
  const applyPreset = useCallback((key: string) => {
    const { start, end } = getDatePreset(key);
    setStartDate(start);
    setEndDate(end);
    setActivePreset(key);
  }, []);

  // Toggle helpers
  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const toggleTitle = (titleJp: string) => {
    setSelectedTitles((prev) => {
      const next = new Set(prev);
      if (next.has(titleJp)) next.delete(titleJp);
      else next.add(titleJp);
      return next;
    });
  };

  // Download handlers
  const handleExcelDownload = async () => {
    if (filteredData.length === 0) return;
    setDownloading(true);
    const opts = {
      startDate: startDate || filteredData[filteredData.length - 1]?.sale_date || '',
      endDate: endDate || filteredData[0]?.sale_date || '',
      platforms: selectedPlatforms.size > 0 ? [...selectedPlatforms] : undefined,
      titles: selectedTitles.size > 0 ? [...selectedTitles] : undefined,
    };
    try {
      await generateWeeklyReport(filteredData, opts);
    } catch (err) {
      console.error('Download error:', err);
    }
    setDownloading(false);
  };

  const handleCSVDownload = () => {
    if (filteredData.length === 0) return;
    const opts = {
      startDate: startDate || filteredData[filteredData.length - 1]?.sale_date || '',
      endDate: endDate || filteredData[0]?.sale_date || '',
    };
    generateCSV(filteredData, opts);
  };

  const colorScheme = theme === 'light' ? 'light' : 'dark';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-5xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center page-icon-glow">
          <FileText size={20} color="white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('리포트 다운로드', 'レポートダウンロード')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('조건 설정 후 리포트 다운로드', '条件設定後レポートダウンロード')}
          </p>
        </div>

        {/* Download buttons */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleCSVDownload}
            disabled={downloading || filteredData.length === 0}
            className="hidden sm:flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all"
            style={{
              ...GLASS_CARD,
              opacity: filteredData.length === 0 ? 0.4 : 1,
              color: 'var(--color-text-secondary)',
            }}
          >
            <Download size={14} />
            CSV
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleExcelDownload}
            disabled={downloading || filteredData.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all btn-gradient"
            style={{
              opacity: downloading || filteredData.length === 0 ? 0.5 : 1,
            }}
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Excel
          </motion.button>
        </div>
      </div>

      {/* Single column layout */}
      <div className="space-y-4">

        {/* Date range */}
        <div className="rounded-2xl p-4" style={GLASS_CARD}>
          <h3 className="text-xs font-semibold tracking-wider uppercase mb-3" style={{ color: 'var(--color-text-muted)' }}>
            <Calendar size={12} className="inline mr-1.5 -mt-0.5" />
            {t('기간 선택', '期間選択')}
          </h3>

          {/* Presets */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all"
                style={{
                  background: activePreset === p.key ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--color-glass)',
                  border: `1px solid ${activePreset === p.key ? 'transparent' : 'var(--color-glass-border)'}`,
                  color: activePreset === p.key ? '#fff' : 'var(--color-text-secondary)',
                }}
              >
                {t(p.ko, p.ja)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-md">
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('시작일', '開始日')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setActivePreset(''); }}
                className="w-full px-2.5 py-2 rounded-xl text-sm outline-none"
                style={{
                  background: 'var(--color-input-bg)',
                  border: '1px solid var(--color-input-border)',
                  color: 'var(--color-text-primary)',
                  colorScheme,
                }}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t('종료일', '終了日')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setActivePreset(''); }}
                className="w-full px-2.5 py-2 rounded-xl text-sm outline-none"
                style={{
                  background: 'var(--color-input-bg)',
                  border: '1px solid var(--color-input-border)',
                  color: 'var(--color-text-primary)',
                  colorScheme,
                }}
              />
            </div>
          </div>
        </div>

        {/* Platform & Title filters side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Platform filter */}
          <div className="rounded-2xl p-4" style={GLASS_CARD}>
            <button
              onClick={() => setPlatformOpen(!platformOpen)}
              className="flex items-center justify-between w-full cursor-pointer"
            >
              <h3 className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--color-text-muted)' }}>
                {t('플랫폼 선택', 'プラットフォーム選択')}
                {selectedPlatforms.size > 0 && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(59,111,246,0.15)', color: '#3B6FF6' }}>
                    {selectedPlatforms.size}
                  </span>
                )}
              </h3>
              {platformOpen ? <ChevronUp size={14} color="var(--color-text-muted)" /> : <ChevronDown size={14} color="var(--color-text-muted)" />}
            </button>

            {/* Selected tags */}
            {!platformOpen && selectedPlatforms.size > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[...selectedPlatforms].map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(59,111,246,0.12)', color: '#3B6FF6' }}
                  >
                    {p}
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePlatform(p); }}
                      className="cursor-pointer"
                      style={{ border: 'none', background: 'transparent', color: '#3B6FF6', padding: 0 }}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <AnimatePresence>
              {platformOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedPlatforms.size > 0 && (
                      <button
                        onClick={() => setSelectedPlatforms(new Set())}
                        className="text-[11px] px-2 py-1 rounded-lg cursor-pointer"
                        style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: 'none' }}
                      >
                        {t('초기화', 'リセット')}
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 mt-2 max-h-[200px] overflow-y-auto">
                    {platforms.map((p) => {
                      const checked = selectedPlatforms.has(p);
                      return (
                        <button
                          key={p}
                          onClick={() => togglePlatform(p)}
                          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-[var(--color-glass-hover)]"
                          style={{ border: 'none', background: 'transparent' }}
                        >
                          {checked
                            ? <CheckSquare size={14} color="#3B6FF6" />
                            : <Square size={14} color="var(--color-text-muted)" />
                          }
                          <PlatformBadge name={p} size="sm" />
                          <span className="text-xs flex-1 text-left" style={{ color: 'var(--color-text-secondary)' }}>{p}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Title filter */}
          <div className="rounded-2xl p-4" style={GLASS_CARD}>
            <button
              onClick={() => setTitleOpen(!titleOpen)}
              className="flex items-center justify-between w-full cursor-pointer"
            >
              <h3 className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--color-text-muted)' }}>
                {t('작품 선택', 'タイトル選択')}
                {selectedTitles.size > 0 && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(59,111,246,0.15)', color: '#3B6FF6' }}>
                    {selectedTitles.size}
                  </span>
                )}
              </h3>
              {titleOpen ? <ChevronUp size={14} color="var(--color-text-muted)" /> : <ChevronDown size={14} color="var(--color-text-muted)" />}
            </button>

            {/* Selected tags when collapsed */}
            {!titleOpen && selectedTitles.size > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[...selectedTitles].slice(0, 5).map((titleJp) => (
                  <span
                    key={titleJp}
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(59,111,246,0.12)', color: '#3B6FF6' }}
                  >
                    {titleJp.length > 15 ? titleJp.slice(0, 15) + '...' : titleJp}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleTitle(titleJp); }}
                      className="cursor-pointer"
                      style={{ border: 'none', background: 'transparent', color: '#3B6FF6', padding: 0 }}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                {selectedTitles.size > 5 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,111,246,0.08)', color: '#3B6FF6' }}>
                    +{selectedTitles.size - 5}
                  </span>
                )}
              </div>
            )}

            <AnimatePresence>
              {titleOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  {/* Selected tags */}
                  {selectedTitles.size > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 mb-2">
                      {[...selectedTitles].map((titleJp) => (
                        <span
                          key={titleJp}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(59,111,246,0.12)', color: '#3B6FF6' }}
                        >
                          {titleJp.length > 20 ? titleJp.slice(0, 20) + '...' : titleJp}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleTitle(titleJp); }}
                            className="cursor-pointer"
                            style={{ border: 'none', background: 'transparent', color: '#3B6FF6', padding: 0 }}
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                      <button
                        onClick={() => setSelectedTitles(new Set())}
                        className="text-[10px] px-2 py-0.5 rounded-full cursor-pointer"
                        style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: 'none' }}
                      >
                        {t('전체 해제', '全解除')}
                      </button>
                    </div>
                  )}

                  {/* Search */}
                  <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl mt-2" style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)' }}>
                    <Search size={12} color="var(--color-text-muted)" />
                    <input
                      type="text"
                      value={titleSearch}
                      onChange={(e) => setTitleSearch(e.target.value)}
                      placeholder={t('작품명 검색...', 'タイトル検索...')}
                      className="flex-1 bg-transparent outline-none text-xs"
                      style={{ color: 'var(--color-text-primary)' }}
                    />
                  </div>

                  {/* Title list */}
                  <div className="space-y-0.5 mt-2 max-h-[250px] overflow-y-auto">
                    {filteredTitles.map(([jp, kr]) => {
                      const checked = selectedTitles.has(jp);
                      return (
                        <button
                          key={jp}
                          onClick={() => toggleTitle(jp)}
                          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-[var(--color-glass-hover)]"
                          style={{ border: 'none', background: 'transparent' }}
                        >
                          {checked
                            ? <CheckSquare size={13} color="#3B6FF6" className="shrink-0" />
                            : <Square size={13} color="var(--color-text-muted)" className="shrink-0" />
                          }
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-xs truncate" style={{ color: 'var(--color-text-primary)' }}>{jp}</p>
                            {kr && <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>{kr}</p>}
                          </div>
                        </button>
                      );
                    })}
                    {filteredTitles.length === 0 && (
                      <p className="text-center py-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {t('결과 없음', '結果なし')}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t('데이터 건수', 'データ件数'), value: filteredData.length.toLocaleString(), suffix: t('건', '件') },
            { label: t('총 매출', '総売上'), value: formatCurrency(totalSales), suffix: '' },
            { label: t('작품 수', 'タイトル数'), value: String(uniqueTitles), suffix: '' },
            { label: t('플랫폼 수', 'PF数'), value: String(uniquePlatforms), suffix: '' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl p-4" style={GLASS_CARD}>
              <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                {stat.label}
              </p>
              <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {stat.value}
                {stat.suffix && <span className="text-xs font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>{stat.suffix}</span>}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile download buttons */}
        <div className="flex sm:hidden gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleCSVDownload}
            disabled={filteredData.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
            style={{
              ...GLASS_CARD,
              opacity: filteredData.length === 0 ? 0.4 : 1,
              color: 'var(--color-text-secondary)',
            }}
          >
            <Download size={14} />
            CSV
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleExcelDownload}
            disabled={downloading || filteredData.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer btn-gradient"
            style={{ opacity: downloading || filteredData.length === 0 ? 0.5 : 1 }}
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Excel
          </motion.button>
        </div>

        {/* Preview table */}
        {loadingData ? (
          <div className="rounded-2xl p-6 animate-pulse" style={GLASS_CARD}>
            <div className="h-4 w-48 rounded skeleton-shimmer mb-6" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-3">
                <div className="h-4 flex-1 rounded skeleton-shimmer" />
                <div className="h-4 w-20 rounded skeleton-shimmer" />
                <div className="h-4 w-24 rounded skeleton-shimmer" />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl p-4 overflow-x-auto" style={GLASS_CARD}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                <BarChart3 size={14} className="inline mr-1.5 -mt-0.5" />
                {t('미리보기', 'プレビュー')}
                <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>
                  ({t(`상위 ${Math.min(filteredData.length, 100)}건`, `上位${Math.min(filteredData.length, 100)}件`)})
                </span>
              </h3>
              {filteredData.length > 100 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
                  {t(`전체 ${filteredData.length.toLocaleString()}건 중 100건 표시`, `全${filteredData.length.toLocaleString()}件中100件表示`)}
                </span>
              )}
            </div>

            {filteredData.length === 0 ? (
              <div className="text-center py-16">
                <FileText size={40} style={{ color: 'var(--color-text-subtle)', margin: '0 auto 12px' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {t('조건에 맞는 데이터가 없습니다', '条件に一致するデータがありません')}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>
                  {t('필터 조건을 변경해 보세요', 'フィルター条件を変更してください')}
                </p>
              </div>
            ) : (
              <table className="w-full text-sm min-w-[650px] table-striped">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-table-border)' }}>
                    <th className="py-2.5 px-2 text-left text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('날짜', '日付')}</th>
                    <th className="py-2.5 px-2 text-left text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('작품', 'タイトル')}</th>
                    <th className="py-2.5 px-2 text-left text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>PF</th>
                    <th className="py-2.5 px-2 text-right text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('매출', '売上')}</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => (
                    <tr key={`${row.id}-${idx}`} style={{ borderBottom: '1px solid var(--color-table-border-subtle)' }} className="hover:bg-[var(--color-glass)] transition-colors">
                      <td className="py-2.5 px-2 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{row.sale_date}</td>
                      <td className="py-2.5 px-2" style={{ maxWidth: '250px' }}>
                        <p className="text-xs font-medium truncate" title={row.title_jp} style={{ color: 'var(--color-text-primary)' }}>{row.title_jp}</p>
                        {row.title_kr && (
                          <p className="text-[10px] truncate" title={row.title_kr} style={{ color: 'var(--color-text-muted)' }}>{row.title_kr}</p>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        <PlatformBadge name={row.channel} showName={false} size="sm" />
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-semibold text-xs" style={{ color: 'var(--color-text-primary)' }}>
                        {formatCurrency(row.sales_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
