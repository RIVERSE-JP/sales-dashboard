'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTitleSummaries, useTitleMaster, useTitleRankings } from '@/hooks/useData';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
  LineChart, Line, Legend, ReferenceDot,
} from 'recharts';
import { BookOpen, ArrowLeft, GitCompare, CheckSquare, Square } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { fetchTitleDetail, extractBaseTitle, extractProductType } from '@/lib/supabase';
import { getPlatformColor } from '@/utils/platformConfig';
import { PlatformBadge } from '@/components/PlatformBadge';
import { useApp } from '@/context/AppContext';
import type { TitleSummaryRow, TitleDetailData, TitleMasterRow, TitleRankingRow } from '@/types';

import { GLASS_CARD, containerVariants, cardVariants } from '@/components/titles/constants';
import type { SalesPreset } from '@/components/titles/constants';
import { ListSkeleton, ChartSkeleton } from '@/components/titles/Skeletons';
import { FilterPanel } from '@/components/titles/FilterPanel';
import { CompareChart } from '@/components/titles/CompareChart';
import { PlatformTimeSeries } from '@/components/titles/PlatformTimeSeries';

// ============================================================
// Props — server-side prefetched data
// ============================================================

export interface TitlesInitialData {
  summaries: TitleSummaryRow[] | null;
  titleMaster: TitleMasterRow[] | null;
  genres: Array<{ id: number; name: string }> | null;
}

interface TitlesClientProps {
  initialData?: TitlesInitialData | null;
}

// ============================================================
// Helpers
// ============================================================

function formatShort(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}億`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}万`;
  return value.toLocaleString();
}

// isNew: 최근 3개월 이내 서비스 시작 (데이터 유지, UI 표시 안 함)
function isNewTitle(firstDate: string | null, launchDate: string | null): boolean {
  const ref = launchDate ?? firstDate;
  if (!ref) return false;
  const d = new Date(ref);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return d >= threeMonthsAgo;
}

function getDateRangeForRanking() {
  const now = new Date();
  const currentEnd = now.toISOString().slice(0, 10);
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
  return { currentStart, currentEnd, prevStart, prevEnd };
}

// ============================================================
// Enriched title type
// ============================================================

interface EnrichedTitle extends TitleSummaryRow {
  genre_name?: string;
  company_name?: string;
  serial_status?: string;
  content_format?: string;
  latest_episode_count?: number;
  service_launch_date?: string;
  isNew: boolean;
  rank_change?: number;
}

interface EnrichedGroupedProduct extends EnrichedTitle {
  product_type: string;
}

interface EnrichedGroupedTitle {
  base_title: string;
  products: EnrichedGroupedProduct[];
  total_sales: number;
  channels: string[];
}

// ============================================================
// Main Page
// ============================================================

export default function TitlesClient({ initialData }: TitlesClientProps) {
  const { formatCurrency, t } = useApp();
  const searchParams = useSearchParams();
  const highlightTitle = searchParams.get('highlight');

  // SWR data hooks (client-side fetch with server prefetch as fallback)
  const { data: summariesRaw } = useTitleSummaries();
  const { data: masterRaw } = useTitleMaster();
  // genres extracted from masterMap instead of useGenres()

  const { currentStart, currentEnd, prevStart, prevEnd } = useMemo(() => getDateRangeForRanking(), []);
  const { data: rankingsRaw } = useTitleRankings(currentStart, currentEnd, prevStart, prevEnd);

  // Normalize SWR data — prefer SWR, then initialData, then empty
  const effectiveSummaries = summariesRaw ?? initialData?.summaries;
  const titles = useMemo<TitleSummaryRow[]>(() => {
    if (!effectiveSummaries) return [];
    return (effectiveSummaries as TitleSummaryRow[]).map((row: TitleSummaryRow) => ({
      title_jp: row.title_jp,
      title_kr: row.title_kr,
      channels: row.channels ?? [],
      first_date: row.first_date,
      total_sales: row.total_sales,
      day_count: row.day_count,
    })).sort((a: TitleSummaryRow, b: TitleSummaryRow) => b.total_sales - a.total_sales);
  }, [effectiveSummaries]);

  const titleMaster = useMemo<TitleMasterRow[]>(() => (masterRaw as unknown as TitleMasterRow[]) ?? (initialData?.titleMaster as unknown as TitleMasterRow[]) ?? [], [masterRaw, initialData?.titleMaster]);
  const rankings = useMemo<TitleRankingRow[]>(() => rankingsRaw ?? [], [rankingsRaw]);

  const loading = !summariesRaw && !masterRaw && !initialData?.summaries;

  // Detail state
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<TitleDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<EnrichedGroupedTitle | null>(null);

  // Filter state (B1)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [salesPreset, setSalesPreset] = useState<SalesPreset>('all');
  const [serialStatusTab, setSerialStatusTab] = useState('all');

  // Sort state
  const [sortBy, setSortBy] = useState('sales_desc');
  const [sortKey, setSortKey] = useState<string>('sales');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [displayCount, setDisplayCount] = useState(60);

  // Compare mode (B5)
  const [compareMode, setCompareMode] = useState(false);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  // Trend period toggle for "매출 추이" chart
  const [trendPeriod, setTrendPeriod] = useState<'monthly' | 'weekly' | 'daily'>('monthly');

  // Product-level detail data for multi-product groups
  const [productDetails, setProductDetails] = useState<Map<string, TitleDetailData>>(new Map());

  // ============================================================
  // Title master map
  // ============================================================

  const masterMap = useMemo(() => {
    const map = new Map<string, TitleMasterRow & { genre_name?: string; company_name?: string }>();
    titleMaster.forEach((m) => {
      // API returns genres: { name_kr }, production_companies: { name }
      const raw = m as unknown as Record<string, unknown>;
      const genres = raw.genres as Record<string, string> | null | undefined;
      const companies = raw.production_companies as Record<string, string> | null | undefined;
      const rawGenre = genres?.name_kr ?? genres?.name_jp ?? (m as unknown as Record<string, string>).genre_name ?? '';
      map.set(m.title_jp, {
        ...m,
        genre_name: (rawGenre && rawGenre !== '-') ? rawGenre : '',
        company_name: companies?.name ?? (m as unknown as Record<string, string>).company_name ?? '',
      });
    });
    return map;
  }, [titleMaster]);

  const rankingMap = useMemo(() => {
    const map = new Map<string, number>();
    rankings.forEach((r) => map.set(r.title_jp, r.rank_change));
    return map;
  }, [rankings]);

  // ============================================================
  // Derived filter options
  // ============================================================

  // 장르/제작사 목록: 매출 데이터가 있는 작품(titles = summaries)의 것만 표시
  const titleJpSet = useMemo(() => new Set(titles.map(t => t.title_jp)), [titles]);

  const genres = useMemo<Array<{ id: number; name: string }>>(() => {
    const genreSet = new Set<string>();
    let hasUnclassified = false;
    for (const [titleJp, m] of masterMap) {
      if (!titleJpSet.has(titleJp)) continue; // 매출 없는 작품 제외
      if (m.genre_name) genreSet.add(m.genre_name);
      else hasUnclassified = true;
    }
    const list = Array.from(genreSet).sort().map((name, i) => ({ id: i + 1, name }));
    if (hasUnclassified) list.push({ id: 9999, name: '미분류' });
    return list;
  }, [masterMap, titleJpSet]);

  const companies = useMemo(() => {
    const set = new Set<string>();
    for (const [titleJp, m] of masterMap) {
      if (!titleJpSet.has(titleJp)) continue; // 매출 없는 작품 제외
      if (m.company_name) set.add(m.company_name);
    }
    return Array.from(set).sort();
  }, [masterMap, titleJpSet]);

  const platforms = useMemo(() => {
    const set = new Set<string>();
    titles.forEach((t) => t.channels.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [titles]);

  // ============================================================
  // Enriched + filtered titles
  // ============================================================

  const enrichedTitles = useMemo((): EnrichedTitle[] => {
    return titles.map((t) => {
      const master = masterMap.get(t.title_jp);
      return {
        ...t,
        genre_name: master?.genre_name ?? undefined,
        company_name: master?.company_name ?? undefined,
        serial_status: master?.serial_status ?? undefined,
        content_format: master?.content_format ?? undefined,
        latest_episode_count: master?.latest_episode_count ?? undefined,
        service_launch_date: master?.service_launch_date ?? undefined,
        isNew: isNewTitle(t.first_date, master?.service_launch_date ?? null),
        rank_change: rankingMap.get(t.title_jp),
      };
    });
  }, [titles, masterMap, rankingMap]);

  // ============================================================
  // Group by base_title
  // ============================================================

  const groupedTitles = useMemo((): EnrichedGroupedTitle[] => {
    if (!enrichedTitles.length) return [];
    const map = new Map<string, EnrichedGroupedTitle>();
    for (const t of enrichedTitles) {
      const base = extractBaseTitle(t.title_jp);
      const productType = extractProductType(t.title_jp);
      if (!map.has(base)) {
        map.set(base, {
          base_title: base,
          products: [],
          total_sales: 0,
          channels: [],
        });
      }
      const group = map.get(base)!;
      group.products.push({ ...t, product_type: productType });
      group.total_sales += t.total_sales;
      for (const ch of (t.channels || [])) {
        if (!group.channels.includes(ch)) group.channels.push(ch);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total_sales - a.total_sales);
  }, [enrichedTitles]);

  // ============================================================
  // Filtered grouped titles
  // ============================================================

  const filteredGrouped = useMemo((): EnrichedGroupedTitle[] => {
    let result = groupedTitles;

    // Search across base_title and all product names
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g =>
        g.base_title.toLowerCase().includes(q) ||
        g.products.some(p => p.title_jp.toLowerCase().includes(q) || (p.title_kr?.toLowerCase().includes(q) ?? false))
      );
    }

    // Serial status tab
    if (serialStatusTab !== 'all') {
      result = result.filter(g => g.products.some(p => p.serial_status === serialStatusTab));
    }

    // Genre
    if (selectedGenre) {
      if (selectedGenre === '미분류') {
        result = result.filter(g => g.products.some(p => !p.genre_name));
      } else {
        result = result.filter(g => g.products.some(p => p.genre_name === selectedGenre));
      }
    }

    // Company
    if (selectedCompany) {
      result = result.filter(g => g.products.some(p => p.company_name === selectedCompany));
    }

    // Platform
    if (selectedPlatform) {
      result = result.filter(g => g.channels.includes(selectedPlatform));
    }

    // Serial status dropdown
    if (selectedStatus) {
      result = result.filter(g => g.products.some(p => p.serial_status === selectedStatus));
    }

    // Content format
    if (selectedFormat) {
      result = result.filter(g => g.products.some(p => p.content_format === selectedFormat));
    }

    // Sales preset
    if (salesPreset !== 'all' && result.length > 0) {
      const sorted = [...result].sort((a, b) => b.total_sales - a.total_sales);
      const len = sorted.length;
      if (salesPreset === 'top10') {
        result = sorted.slice(0, Math.ceil(len * 0.1));
      } else if (salesPreset === 'top50') {
        result = sorted.slice(0, Math.ceil(len * 0.5));
      } else if (salesPreset === 'bottom50') {
        result = sorted.slice(Math.ceil(len * 0.5));
      }
    }

    // Sort using sortKey + sortDir
    const dir = sortDir === 'asc' ? 1 : -1;
    result = [...result].sort((a, b) => {
      const mainA = a.products.find(p => p.product_type === 'オリジナル') ?? a.products[0];
      const mainB = b.products.find(p => p.product_type === 'オリジナル') ?? b.products[0];
      switch (sortKey) {
        case 'sales':
          return (a.total_sales - b.total_sales) * dir;
        case 'title_jp':
          return a.base_title.localeCompare(b.base_title, 'ja') * dir;
        case 'title_kr': {
          const krA = mainA?.title_kr ?? '';
          const krB = mainB?.title_kr ?? '';
          return krA.localeCompare(krB, 'ko') * dir;
        }
        case 'genre': {
          const gA = mainA?.genre_name ?? '';
          const gB = mainB?.genre_name ?? '';
          return gA.localeCompare(gB, 'ja') * dir;
        }
        case 'company': {
          const cA = mainA?.company_name ?? '';
          const cB = mainB?.company_name ?? '';
          return cA.localeCompare(cB, 'ja') * dir;
        }
        case 'platforms':
          return (a.channels.length - b.channels.length) * dir;
        case 'newest': {
          const aDate = mainA?.first_date ?? '';
          const bDate = mainB?.first_date ?? '';
          return aDate.localeCompare(bDate) * dir;
        }
        default:
          return (a.total_sales - b.total_sales) * dir;
      }
    });

    return result;
  }, [groupedTitles, searchQuery, serialStatusTab, selectedGenre, selectedCompany, selectedPlatform, selectedStatus, selectedFormat, salesPreset, sortKey, sortDir]);

  // ============================================================
  // Detail loading
  // ============================================================

  const loadTitleDetail = useCallback(async (titleJP: string, group?: EnrichedGroupedTitle | null) => {
    setDetailLoading(true);
    setSelectedTitle(titleJP);
    setSelectedGroup(group ?? null);
    setTrendPeriod('monthly');
    setProductDetails(new Map());
    // Pick main product: prefer original, fallback to first
    const mainTitleJP = group
      ? (group.products.find(p => p.product_type === 'オリジナル') ?? group.products[0])?.title_jp ?? titleJP
      : titleJP;
    try {
      const data = await fetchTitleDetail(mainTitleJP);
      setDetailData(data);

      // For multi-product groups, fetch detail for each product
      if (group && group.products.length > 1) {
        const detailMap = new Map<string, TitleDetailData>();
        const fetches = group.products.map(async (p) => {
          try {
            const d = await fetchTitleDetail(p.title_jp);
            if (d) detailMap.set(p.title_jp, d);
          } catch { /* skip failed fetches */ }
        });
        await Promise.all(fetches);
        setProductDetails(detailMap);
      }
    } catch (err) {
      console.error('Failed to load title detail:', err);
      setDetailData(null);
    }
    setDetailLoading(false);
  }, []);

  // URL-based drill-down: auto-select highlighted title
  useEffect(() => {
    if (highlightTitle && groupedTitles.length > 0 && !loading) {
      // Find a group that contains the highlighted title
      const foundGroup = groupedTitles.find(g => g.products.some(p => p.title_jp === highlightTitle));
      if (foundGroup) {
        const mainProduct = foundGroup.products.find(p => p.product_type === 'オリジナル') ?? foundGroup.products[0];
        loadTitleDetail(mainProduct?.title_jp ?? highlightTitle, foundGroup); // eslint-disable-line react-hooks/set-state-in-effect
      }
    }
  }, [highlightTitle, groupedTitles, loading, loadTitleDetail]);

  // Compare toggle
  const toggleCompare = (titleJP: string) => {
    setCompareList((prev) => {
      if (prev.includes(titleJP)) return prev.filter((t) => t !== titleJP);
      if (prev.length >= 5) return prev;
      return [...prev, titleJP];
    });
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedGenre('');
    setSelectedCompany('');
    setSelectedPlatform('');
    setSelectedStatus('');
    setSelectedFormat('');
    setSalesPreset('all');
    setSerialStatusTab('all');
  };

  // Sync dropdown sortBy → sortKey/sortDir
  const handleSortByChange = useCallback((value: string) => {
    setSortBy(value);
    setDisplayCount(60);
    switch (value) {
      case 'sales_desc': setSortKey('sales'); setSortDir('desc'); break;
      case 'sales_asc': setSortKey('sales'); setSortDir('asc'); break;
      case 'title_jp': setSortKey('title_jp'); setSortDir('asc'); break;
      case 'title_kr': setSortKey('title_kr'); setSortDir('asc'); break;
      case 'genre': setSortKey('genre'); setSortDir('asc'); break;
      case 'company': setSortKey('company'); setSortDir('asc'); break;
      case 'platforms': setSortKey('platforms'); setSortDir('desc'); break;
      case 'newest': setSortKey('newest'); setSortDir('desc'); break;
      default: setSortKey('sales'); setSortDir('desc');
    }
  }, []);

  // Column header click handler
  const handleColumnSort = useCallback((key: string) => {
    setDisplayCount(60);
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'title_jp' || key === 'title_kr' || key === 'genre' || key === 'company' ? 'asc' : 'desc');
    }
  }, [sortKey]);

  const selectedTitleInfo = useMemo(
    () => enrichedTitles.find((t) => t.title_jp === selectedTitle),
    [enrichedTitles, selectedTitle]
  );

  // ============================================================
  // Detail View
  // ============================================================

  if (selectedTitle) {
    const monthlyTrend = detailData?.monthly_trend ?? [];
    const platformBreakdown = (detailData?.platform_breakdown ?? []).map((p) => ({
      ...p,
      color: getPlatformColor(p.channel),
    }));
    const dailyRecent = detailData?.daily_recent ?? [];

    const trendLen = monthlyTrend.length;
    const recentMonth = trendLen > 0 ? monthlyTrend[trendLen - 1].sales : 0;
    const prevMonth = trendLen > 1 ? monthlyTrend[trendLen - 2].sales : 0;
    const periodChange = prevMonth > 0 ? ((recentMonth - prevMonth) / prevMonth) * 100 : 0;

    // B7: Episode efficiency
    const epCount = selectedTitleInfo?.latest_episode_count;
    const totalSales = selectedGroup ? selectedGroup.total_sales : (detailData?.total_sales ?? selectedTitleInfo?.total_sales ?? 0);
    const perEpisodeSales = epCount && epCount > 0 ? totalSales / epCount : null;

    // === 1. Daily sales chart data with first-sale / peak markers ===
    const dailyChartData = dailyRecent.map((d) => ({
      label: d.date.slice(5),
      date: d.date,
      sales: d.sales,
    }));
    const firstSaleDay = dailyChartData.find((d) => d.sales > 0);
    const peakDay = dailyChartData.length > 0
      ? dailyChartData.reduce((max, d) => d.sales > max.sales ? d : max, dailyChartData[0])
      : null;

    // === 2. Trend chart: product-type lines + period toggle ===
    const hasMultipleProducts = selectedGroup != null && selectedGroup.products.length > 1;
    const PRODUCT_COLORS: Record<string, string> = {
      'オリジナル': '#818cf8',
      'ノベル': '#f472b6',
      '完全版': '#34d399',
      '分冊版': '#fbbf24',
      '版面': '#f87171',
      'LDF': '#38bdf8',
      '特装版': '#a78bfa',
      '連載版': '#fb923c',
    };

    // Helper: aggregate daily data to weekly
    const aggregateWeekly = (daily: Array<{ date: string; sales: number }>) => {
      const weeks = new Map<string, number>();
      daily.forEach((d) => {
        const dt = new Date(d.date);
        const day = dt.getDay();
        const monday = new Date(dt);
        monday.setDate(dt.getDate() - ((day + 6) % 7));
        const weekKey = monday.toISOString().slice(0, 10);
        weeks.set(weekKey, (weeks.get(weekKey) ?? 0) + d.sales);
      });
      return Array.from(weeks.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, sales]) => ({ label: week, sales }));
    };

    // Build trend data based on selected period
    const buildTrendData = () => {
      if (!hasMultipleProducts) {
        // Single product: just total line
        if (trendPeriod === 'monthly') {
          return monthlyTrend.map((d) => ({ label: d.month, total: d.sales }));
        } else if (trendPeriod === 'daily') {
          return dailyRecent.map((d) => ({ label: d.date.slice(5), total: d.sales }));
        } else {
          return aggregateWeekly(dailyRecent).map((d) => ({ label: d.label, total: d.sales }));
        }
      }

      // Multiple products: build per-product lines + total
      const productTypes = selectedGroup!.products.map((p) => p.product_type);

      if (trendPeriod === 'monthly') {
        const allMonths = new Set<string>();
        const productMonthly = new Map<string, Map<string, number>>();
        for (const product of selectedGroup!.products) {
          const detail = productDetails.get(product.title_jp);
          if (!detail) continue;
          const monthMap = new Map<string, number>();
          detail.monthly_trend.forEach((m) => { monthMap.set(m.month, m.sales); allMonths.add(m.month); });
          productMonthly.set(product.product_type, monthMap);
        }
        const sortedMonths = Array.from(allMonths).sort();
        return sortedMonths.map((month) => {
          const row: Record<string, unknown> = { label: month };
          let total = 0;
          productTypes.forEach((pt) => {
            const val = productMonthly.get(pt)?.get(month) ?? 0;
            row[pt] = val;
            total += val;
          });
          row.total = total;
          return row;
        });
      } else {
        // daily or weekly from daily_recent
        const allDates = new Set<string>();
        const productDaily = new Map<string, Map<string, number>>();
        for (const product of selectedGroup!.products) {
          const detail = productDetails.get(product.title_jp);
          if (!detail) continue;
          const dateMap = new Map<string, number>();
          detail.daily_recent.forEach((d) => { dateMap.set(d.date, d.sales); allDates.add(d.date); });
          productDaily.set(product.product_type, dateMap);
        }
        const sortedDates = Array.from(allDates).sort();

        if (trendPeriod === 'daily') {
          return sortedDates.map((date) => {
            const row: Record<string, unknown> = { label: date.slice(5) };
            let total = 0;
            productTypes.forEach((pt) => {
              const val = productDaily.get(pt)?.get(date) ?? 0;
              row[pt] = val;
              total += val;
            });
            row.total = total;
            return row;
          });
        } else {
          // weekly aggregation
          const weekData = new Map<string, Record<string, number>>();
          sortedDates.forEach((date) => {
            const dt = new Date(date);
            const day = dt.getDay();
            const monday = new Date(dt);
            monday.setDate(dt.getDate() - ((day + 6) % 7));
            const weekKey = monday.toISOString().slice(0, 10);
            if (!weekData.has(weekKey)) weekData.set(weekKey, {});
            const row = weekData.get(weekKey)!;
            productTypes.forEach((pt) => {
              const val = productDaily.get(pt)?.get(date) ?? 0;
              row[pt] = (row[pt] ?? 0) + val;
            });
          });
          return Array.from(weekData.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([week, vals]) => {
              const row: Record<string, unknown> = { label: week };
              let total = 0;
              productTypes.forEach((pt) => { const v = vals[pt] ?? 0; row[pt] = v; total += v; });
              row.total = total;
              return row;
            });
        }
      }
    };

    const trendData = buildTrendData();
    const productTypes = hasMultipleProducts
      ? selectedGroup!.products.map((p) => p.product_type)
      : [];

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const renderTooltip = ({ active, payload, label }: any) => {
      if (!active || !payload) return null;
      return (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-glass-border)', borderRadius: 12, padding: '10px 14px' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginBottom: 6 }}>{label}</p>
          {payload.map((entry: any) => (
            <p key={entry.name} style={{ color: entry.color, fontSize: 13, fontWeight: 600 }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return (
      <AnimatePresence mode="wait">
      <motion.div key={selectedTitle} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }} style={{ minHeight: '100vh' }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setSelectedTitle(null); setDetailData(null); setSelectedGroup(null); setProductDetails(new Map()); }}
            className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ ...GLASS_CARD }}
          >
            <ArrowLeft size={18} color="var(--color-text-secondary)" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                {selectedGroup ? selectedGroup.base_title : selectedTitle}
              </h1>
            </div>
            {(detailData?.title_kr || selectedTitleInfo?.title_kr) && (
              <p className="text-sm truncate" style={{ color: 'var(--color-text-muted)' }}>
                {detailData?.title_kr || selectedTitleInfo?.title_kr}
              </p>
            )}
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedTitleInfo?.genre_name && (
                <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--color-glass)', color: 'var(--color-text-secondary)' }}>
                  {selectedTitleInfo.genre_name}
                </span>
              )}
              {selectedTitleInfo?.serial_status && (
                <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--color-glass)', color: 'var(--color-text-secondary)' }}>
                  {selectedTitleInfo.serial_status}
                </span>
              )}
              {selectedTitleInfo?.content_format && (
                <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--color-glass)', color: 'var(--color-text-secondary)' }}>
                  {selectedTitleInfo.content_format}
                </span>
              )}
              {selectedTitleInfo?.company_name && (
                <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--color-glass)', color: 'var(--color-text-secondary)' }}>
                  {selectedTitleInfo.company_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {detailLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-2xl p-6 animate-pulse" style={{ ...GLASS_CARD, minHeight: 100 }}>
                  <div className="h-3 w-20 rounded skeleton-shimmer mb-3" />
                  <div className="h-7 w-28 rounded skeleton-shimmer" />
                </div>
              ))}
            </div>
            <ChartSkeleton />
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
            {/* KPI Cards */}
            <div className={`grid grid-cols-1 gap-4 ${perEpisodeSales !== null ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
              {[
                { label: t('누적 매출', '累計売上'), value: formatCurrency(totalSales) },
                { label: t('플랫폼 수', 'プラットフォーム数'), value: String(platformBreakdown.length || (detailData?.channels ?? []).length) },
                {
                  label: t('최근 추이', '期間トレンド'),
                  value: prevMonth > 0 ? `${periodChange > 0 ? '+' : ''}${periodChange.toFixed(1)}%` : '-',
                  color: periodChange >= 0 ? '#22c55e' : '#ef4444',
                },
                ...(perEpisodeSales !== null ? [{
                  label: t('에피소드당 매출', 'エピソード当たり売上'),
                  value: formatCurrency(perEpisodeSales),
                  sub: `${epCount} ${t('화', '話')}`,
                }] : []),
              ].map((kpi, idx) => (
                <motion.div key={idx} variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>{kpi.label}</p>
                  <p className="text-2xl font-bold" style={{ color: (kpi as { color?: string }).color ?? 'var(--color-text-primary)' }}>{kpi.value}</p>
                  {(kpi as { sub?: string }).sub && (
                    <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{(kpi as { sub?: string }).sub}</p>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Product breakdown for grouped titles */}
            {selectedGroup && selectedGroup.products.length > 1 && (
              <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  {t('상품별 매출', '商品別売上')}
                </h3>
                <div className="space-y-2">
                  {selectedGroup.products
                    .sort((a, b) => b.total_sales - a.total_sales)
                    .map((product) => {
                      const pt = product.product_type;
                      return (
                        <div
                          key={product.title_jp}
                          className="flex items-center justify-between p-3 rounded-xl"
                          style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)' }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                              style={{
                                background: pt === 'オリジナル' ? 'rgba(59,111,246,0.1)' : 'rgba(139,92,246,0.1)',
                                color: pt === 'オリジナル' ? '#3B6FF6' : '#8B5CF6',
                              }}>
                              {pt}
                            </span>
                            <span className="text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                              {product.title_jp}
                            </span>
                          </div>
                          <span className="text-sm font-bold shrink-0 ml-2" style={{ color: 'var(--color-text-primary)' }}>
                            {formatCurrency(product.total_sales)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </motion.div>
            )}

            {/* 1. Daily Sales Trend (일별 매출 추이) — replaces TitleLifecycle */}
            {dailyChartData.length > 0 && (
              <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
                <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  {t('매출 라이프사이클', '売上ライフサイクル')}
                </h2>

                {/* 마커 정보 — 차트 위에 HTML로 표시 */}
                <div className="flex gap-3 mb-4 flex-wrap">
                  {firstSaleDay && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-default" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)' }} title={`${firstSaleDay.label} · ${formatCurrency(firstSaleDay.sales)}`}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#34d399' }} />
                      <span className="text-[12px] font-semibold" style={{ color: '#34d399' }}>{t('서비스 시작', 'サービス開始')}</span>
                    </div>
                  )}
                  {peakDay && peakDay.sales > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-default" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }} title={`${peakDay.label} · ${formatCurrency(peakDay.sales)}`}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#fbbf24' }} />
                      <span className="text-[12px] font-semibold" style={{ color: '#f59e0b' }}>{t('최고 매출', '最高売上')}</span>
                    </div>
                  )}
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailyChartData}>
                    <defs>
                      <linearGradient id="dailyTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatShort} width={60} />
                    <ReTooltip content={renderTooltip} />
                    <Area type="monotone" dataKey="sales" name={t('매출', '売上')} stroke="#34d399" strokeWidth={2} fill="url(#dailyTrendGrad)" />
                    {firstSaleDay && (
                      <ReferenceDot x={firstSaleDay.label} y={firstSaleDay.sales} r={6} fill="#34d399" stroke="#fff" strokeWidth={2} />
                    )}
                    {peakDay && peakDay.sales > 0 && peakDay.label !== firstSaleDay?.label && (
                      <ReferenceDot x={peakDay.label} y={peakDay.sales} r={6} fill="#fbbf24" stroke="#fff" strokeWidth={2} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* 2. Sales Trend (매출 추이) — monthly/weekly/daily toggle + product type lines */}
            {(monthlyTrend.length > 0 || dailyRecent.length > 0) && trendData.length > 0 && (
              <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                  <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {t('매출 추이', '売上推移')}
                  </h2>
                  <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-glass-border)' }}>
                    {(['monthly', 'weekly', 'daily'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => setTrendPeriod(period)}
                        className="px-4 py-1.5 text-[12px] font-medium cursor-pointer transition-all"
                        style={{
                          background: trendPeriod === period ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                          color: trendPeriod === period ? '#fff' : 'var(--color-text-secondary)',
                          borderRight: period !== 'daily' ? '1px solid var(--color-glass-border)' : 'none',
                        }}
                      >
                        {period === 'monthly' ? t('월별', '月別') : period === 'weekly' ? t('주별', '週別') : t('일별', '日別')}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  {hasMultipleProducts ? (
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                      <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatShort} width={60} />
                      <ReTooltip content={renderTooltip} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="total" name={t('총합', '合計')} stroke="#818cf8" strokeWidth={3} dot={false} />
                      {productTypes.map((pt) => (
                        <Line key={pt} type="monotone" dataKey={pt} name={pt}
                          stroke={PRODUCT_COLORS[pt] ?? '#94a3b8'} strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                      ))}
                    </LineChart>
                  ) : (
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                      <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatShort} width={60} />
                      <ReTooltip content={renderTooltip} />
                      <Area type="monotone" dataKey="total" name={t('매출', '売上')} stroke="#818cf8" strokeWidth={2} fill="url(#trendGrad)" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Platform breakdown bar chart */}
            {platformBreakdown.length > 0 && (
              <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
                <h2 className="text-base font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
                  {t('플랫폼별 매출', 'プラットフォーム別売上')}
                </h2>
                <ResponsiveContainer width="100%" height={Math.max(200, platformBreakdown.length * 48)}>
                  <BarChart data={platformBreakdown} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatShort} />
                    <YAxis type="category" dataKey="channel" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                    <ReTooltip content={renderTooltip} />
                    <Bar dataKey="sales" name={t('매출', '売上')} radius={[0, 6, 6, 0]} barSize={24}>
                      {platformBreakdown.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Platform Time Series (4. tooltip fixed in PlatformTimeSeries component) */}
            <PlatformTimeSeries
              titleJP={selectedTitle}
              channels={detailData?.channels ?? selectedTitleInfo?.channels ?? []}
              t={t}
            />
          </motion.div>
        )}
      </motion.div>
      </AnimatePresence>
    );
  }

  // ============================================================
  // List View
  // ============================================================

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center page-icon-glow">
          <BookOpen size={20} color="white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('작품 분석', 'タイトル分析')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('작품별 매출 분석 및 트렌드', '作品別の売上分析・トレンド')}
          </p>
        </div>
        {/* B5: Compare mode toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setCompareMode((prev) => !prev);
            if (compareMode) { setCompareList([]); setShowCompare(false); }
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all"
          style={{
            ...GLASS_CARD,
            background: compareMode ? 'var(--color-accent-blue, #818cf8)' : 'var(--color-glass)',
            color: compareMode ? '#fff' : 'var(--color-text-secondary)',
          }}
        >
          <GitCompare size={14} />
          {t('비교 모드', '比較モード')}
        </motion.button>
      </div>

      {/* B5: Compare bar */}
      {compareMode && compareList.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-2xl p-4 mb-4 flex items-center gap-3 flex-wrap"
          style={GLASS_CARD}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {compareList.length}/5 {t('선택됨', '選択済み')}
          </span>
          <div className="flex gap-1 flex-wrap flex-1">
            {compareList.map((title) => (
              <span key={title} className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'var(--color-glass)', color: 'var(--color-text-primary)' }}>
                {title.length > 15 ? title.slice(0, 15) + '…' : title}
                <button onClick={() => toggleCompare(title)} className="ml-1 cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>×</button>
              </span>
            ))}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCompare(true)}
            disabled={compareList.length < 2}
            className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-40"
            style={{ background: '#818cf8', color: '#fff' }}
          >
            {t('비교하기', '比較する')}
          </motion.button>
        </motion.div>
      )}

      {/* B5: Compare chart overlay */}
      {showCompare && compareList.length >= 2 && (
        <CompareChart selectedTitles={compareList} onClose={() => setShowCompare(false)} t={t} />
      )}

      {/* Filter Panel (B1, B2, B6) */}
      <FilterPanel
        t={t}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        genres={genres}
        companies={companies}
        platforms={platforms}
        selectedGenre={selectedGenre}
        setSelectedGenre={setSelectedGenre}
        selectedCompany={selectedCompany}
        setSelectedCompany={setSelectedCompany}
        selectedPlatform={selectedPlatform}
        setSelectedPlatform={setSelectedPlatform}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedFormat={selectedFormat}
        setSelectedFormat={setSelectedFormat}
        salesPreset={salesPreset}
        setSalesPreset={setSalesPreset}
        serialStatusTab={serialStatusTab}
        setSerialStatusTab={setSerialStatusTab}
        sortBy={sortBy}
        setSortBy={handleSortByChange}
        onReset={resetFilters}
        filteredCount={filteredGrouped.length}
        totalCount={groupedTitles.length}
      />

      {/* Title Table */}
      {loading ? (
        <ListSkeleton />
      ) : filteredGrouped.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <BookOpen size={48} color="var(--color-text-muted)" strokeWidth={1.2} />
          </motion.div>
          <p className="mt-4 text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {t('해당하는 작품이 없습니다', '該当するタイトルがありません')}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
            {t('필터를 조정해 보세요', 'フィルターを調整してみてください')}
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="overflow-x-auto rounded-2xl" style={GLASS_CARD}>
            <table className="w-full" style={{ minWidth: 800 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                  {[
                    { key: '', label: '#', sortable: false, className: 'w-10 text-center' },
                    ...(compareMode ? [{ key: '__compare', label: '', sortable: false, className: 'w-8' }] : []),
                    { key: 'title_jp', label: t('작품명', 'タイトル'), sortable: true, className: 'text-left', style: { width: '30%' } },
                    { key: 'genre', label: t('장르', 'ジャンル'), sortable: true, className: 'text-left', style: { width: '12%' } },
                    { key: 'company', label: t('제작사', '制作会社'), sortable: true, className: 'text-left', style: { width: '15%' } },
                    { key: 'platforms', label: t('플랫폼', 'PF'), sortable: true, className: 'text-center', style: { width: '18%' } },
                    { key: 'sales', label: t('매출', '売上'), sortable: true, className: 'text-right', style: { width: '15%' } },
                  ].map((col) => (
                    <th
                      key={col.key || 'rank'}
                      className={`px-3 py-3 text-xs font-semibold whitespace-nowrap ${col.className ?? ''} ${col.sortable ? 'cursor-pointer select-none hover:opacity-80' : ''}`}
                      style={{
                        color: col.sortable && sortKey === col.key ? 'var(--color-accent-blue, #818cf8)' : 'var(--color-text-secondary)',
                        background: 'var(--color-glass)',
                        ...((col as Record<string, unknown>).style as Record<string, string> ?? {}),
                      }}
                      onClick={() => col.sortable && handleColumnSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {col.sortable && sortKey === col.key && (
                          <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredGrouped.slice(0, displayCount).map((group, idx) => {
                  const mainProduct = group.products.find(p => p.product_type === 'オリジナル') ?? group.products[0];
                  const mainTitleJP = mainProduct?.title_jp ?? group.base_title;
                  const isCompareSelected = compareList.includes(mainTitleJP);
                  const mainTitle = mainProduct;
                  const nonOriginalTypes = group.products
                    .map(p => p.product_type)
                    .filter(t => t !== 'オリジナル');

                  return (
                    <tr
                      key={group.base_title}
                      className="transition-colors cursor-pointer"
                      style={{
                        borderBottom: '1px solid var(--color-glass-border)',
                        borderLeft: isCompareSelected ? '3px solid var(--color-accent-blue, #818cf8)' : '3px solid transparent',
                      }}
                      onClick={() => {
                        if (compareMode) {
                          toggleCompare(mainTitleJP);
                        } else {
                          loadTitleDetail(mainTitleJP, group);
                        }
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-glass)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      {/* # */}
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm font-bold" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
                          {idx + 1}
                        </span>
                      </td>

                      {/* Compare checkbox */}
                      {compareMode && (
                        <td className="px-2 py-3">
                          <div className="shrink-0">
                            {isCompareSelected ? (
                              <CheckSquare size={16} color="#818cf8" />
                            ) : (
                              <Square size={16} color="var(--color-text-muted)" />
                            )}
                          </div>
                        </td>
                      )}

                      {/* Title */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-bold truncate" title={group.base_title} style={{ color: 'var(--color-text-primary)' }}>
                                {group.base_title}
                              </span>
                              {/* isNew data preserved but badge hidden */}
                              {group.products.length > 1 && nonOriginalTypes.length > 0 && (
                                <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full"
                                  style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>
                                  {nonOriginalTypes.join('+')}
                                </span>
                              )}
                            </div>
                            {mainTitle?.title_kr && (
                              <p className="text-[11px] truncate mt-0.5" title={mainTitle.title_kr} style={{ color: 'var(--color-text-muted)' }}>
                                {mainTitle.title_kr}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Genre */}
                      <td className="px-3 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: mainTitle?.genre_name ? 'var(--color-glass)' : 'transparent', color: mainTitle?.genre_name ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>
                          {mainTitle?.genre_name || '미분류'}
                        </span>
                      </td>

                      {/* Company */}
                      <td className="px-3 py-3">
                        <span className="text-xs truncate block max-w-[120px]" title={mainTitle?.company_name || ''} style={{ color: 'var(--color-text-secondary)' }}>
                          {mainTitle?.company_name || '-'}
                        </span>
                      </td>

                      {/* Platforms */}
                      <td className="px-3 py-3">
                        <div className="flex gap-1 justify-center flex-wrap">
                          {group.channels.slice(0, 4).map((p) => (
                            <PlatformBadge key={p} name={p} showName={false} size="sm" />
                          ))}
                          {group.channels.length > 4 && (
                            <span className="text-[10px] px-1 py-0.5 rounded-full font-medium" style={{ color: 'var(--color-text-muted)' }}>
                              +{group.channels.length - 4}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sales */}
                      <td className="px-3 py-3 text-right">
                        <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                          {formatCurrency(group.total_sales)}
                        </p>
                        {mainTitle?.rank_change !== undefined && mainTitle.rank_change !== 0 && (
                          <span
                            className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                            style={{
                              background: mainTitle.rank_change > 0 ? '#22c55e15' : '#ef444415',
                              color: mainTitle.rank_change > 0 ? '#22c55e' : '#ef4444',
                            }}
                          >
                            {mainTitle.rank_change > 0 ? '▲' : '▼'}{Math.abs(mainTitle.rank_change)}
                          </span>
                        )}
                        {mainTitle?.rank_change === 0 && (
                          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Show more button */}
          {displayCount < filteredGrouped.length && (
            <div className="flex justify-center mt-4">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setDisplayCount(prev => prev + 60)}
                className="px-6 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all"
                style={{
                  ...GLASS_CARD,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {t('더 보기', 'もっと見る')} ({Math.min(displayCount + 60, filteredGrouped.length) - displayCount}{t('개 더', '件追加')})
              </motion.button>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
