'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GitCompare, CheckSquare, Square, Search, X } from 'lucide-react';
import { useTitleSummaries, useTitleMaster } from '@/hooks/useData';
import { extractBaseTitle, extractProductType } from '@/lib/supabase';
import { PlatformBadge } from '@/components/PlatformBadge';
import { useApp } from '@/context/AppContext';
import { GLASS_CARD } from '@/lib/design-tokens';
import { CompareChart } from '@/components/titles/CompareChart';
import type { TitleSummaryRow, TitleMasterRow } from '@/types';

export interface TitleCompareInitialData {
  summaries: TitleSummaryRow[] | null;
  titleMaster: TitleMasterRow[] | null;
}

interface EnrichedTitle extends TitleSummaryRow {
  genre_name?: string;
  company_name?: string;
  service_launch_date?: string;
}

interface EnrichedGroup {
  base_title: string;
  products: (EnrichedTitle & { product_type: string })[];
  total_sales: number;
  channels: string[];
}

const MAX_SELECT = 10;

export default function TitleCompareClient({ initialData }: { initialData?: TitleCompareInitialData | null }) {
  const { formatCurrency, t } = useApp();

  const { data: summariesRaw } = useTitleSummaries(undefined, undefined);
  const { data: masterRaw } = useTitleMaster();

  const effectiveSummaries = summariesRaw ?? initialData?.summaries;
  const titleMaster = useMemo<TitleMasterRow[]>(
    () => (masterRaw as unknown as TitleMasterRow[]) ?? (initialData?.titleMaster as unknown as TitleMasterRow[]) ?? [],
    [masterRaw, initialData?.titleMaster],
  );
  const loading = !summariesRaw && !masterRaw && !initialData?.summaries;

  // master map (장르·제작사·런칭일)
  const masterMap = useMemo(() => {
    const map = new Map<string, TitleMasterRow & { genre_name?: string; company_name?: string }>();
    for (const m of titleMaster) {
      const raw = m as unknown as Record<string, unknown>;
      const genres = raw.genres as Record<string, string> | null | undefined;
      const companies = raw.production_companies as Record<string, string> | null | undefined;
      const rawGenre = genres?.name_kr ?? genres?.name_jp ?? (m as unknown as Record<string, string>).genre_name ?? '';
      map.set(m.title_jp, {
        ...m,
        genre_name: rawGenre && rawGenre !== '-' ? rawGenre : '',
        company_name: companies?.name ?? (m as unknown as Record<string, string>).company_name ?? '',
      });
    }
    return map;
  }, [titleMaster]);

  // titles → enriched → grouped
  const titles = useMemo<TitleSummaryRow[]>(() => {
    if (!effectiveSummaries) return [];
    return (effectiveSummaries as TitleSummaryRow[])
      .map((row) => ({
        title_jp: row.title_jp,
        title_kr: row.title_kr,
        channels: row.channels ?? [],
        first_date: row.first_date,
        total_sales: row.total_sales,
        day_count: row.day_count,
      }))
      .sort((a, b) => b.total_sales - a.total_sales);
  }, [effectiveSummaries]);

  const groupedTitles = useMemo<EnrichedGroup[]>(() => {
    if (titles.length === 0) return [];
    const map = new Map<string, EnrichedGroup>();
    for (const tt of titles) {
      const m = masterMap.get(tt.title_jp);
      const enriched: EnrichedTitle = {
        ...tt,
        genre_name: m?.genre_name,
        company_name: m?.company_name,
        service_launch_date: m?.service_launch_date ?? undefined,
      };
      const base = extractBaseTitle(tt.title_jp);
      const productType = extractProductType(tt.title_jp);
      if (!map.has(base)) {
        map.set(base, { base_title: base, products: [], total_sales: 0, channels: [] });
      }
      const g = map.get(base)!;
      g.products.push({ ...enriched, product_type: productType });
      g.total_sales += tt.total_sales;
      for (const ch of tt.channels || []) {
        if (!g.channels.includes(ch)) g.channels.push(ch);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total_sales - a.total_sales);
  }, [titles, masterMap]);

  // 필터 옵션
  const titleJpSet = useMemo(() => new Set(titles.map((tt) => tt.title_jp)), [titles]);
  const genres = useMemo(() => {
    const set = new Set<string>();
    for (const [jp, m] of masterMap) {
      if (!titleJpSet.has(jp)) continue;
      if (m.genre_name) set.add(m.genre_name);
    }
    return Array.from(set).sort();
  }, [masterMap, titleJpSet]);
  const companies = useMemo(() => {
    const set = new Set<string>();
    for (const [jp, m] of masterMap) {
      if (!titleJpSet.has(jp)) continue;
      if (m.company_name) set.add(m.company_name);
    }
    return Array.from(set).sort();
  }, [masterMap, titleJpSet]);
  const platforms = useMemo(() => {
    const set = new Set<string>();
    titles.forEach((tt) => tt.channels.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [titles]);

  // 필터/선택 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const toggleCompare = (titleJP: string) => {
    setCompareList((prev) => {
      if (prev.includes(titleJP)) return prev.filter((tt) => tt !== titleJP);
      if (prev.length >= MAX_SELECT) return prev;
      return [...prev, titleJP];
    });
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedGenre('');
    setSelectedCompany('');
    setSelectedPlatform('');
  };

  const filteredGrouped = useMemo(() => {
    let list = groupedTitles;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (g) =>
          g.base_title.toLowerCase().includes(q) ||
          g.products.some((p) => p.title_jp.toLowerCase().includes(q) || (p.title_kr?.toLowerCase().includes(q) ?? false)),
      );
    }
    if (selectedGenre) list = list.filter((g) => g.products.some((p) => p.genre_name === selectedGenre));
    if (selectedCompany) list = list.filter((g) => g.products.some((p) => p.company_name === selectedCompany));
    if (selectedPlatform) list = list.filter((g) => g.channels.includes(selectedPlatform));
    return list;
  }, [groupedTitles, searchQuery, selectedGenre, selectedCompany, selectedPlatform]);

  const displayCount = 100;
  const hasActiveFilter = Boolean(searchQuery || selectedGenre || selectedCompany || selectedPlatform);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center page-icon-glow">
            <GitCompare size={20} color="white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('작품 비교', 'タイトル比較')}
          </h1>
        </div>
        <p className="text-sm mt-1 ml-14" style={{ color: 'var(--color-text-muted)' }}>
          {t('최대 10개 작품을 선택해 매출 추이를 비교합니다', '最大10タイトルを選んで売上推移を比較')}
        </p>
      </div>

      {/* 선택 바 */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 mb-4 flex items-center gap-3 flex-wrap"
        style={GLASS_CARD}
      >
        <span className="text-[13px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {compareList.length}/{MAX_SELECT} {t('선택됨', '選択済み')}
        </span>
        <div className="flex gap-1 flex-wrap flex-1 min-w-[200px]">
          {compareList.length === 0 ? (
            <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
              {t('아래 목록에서 비교할 작품을 선택하세요 (최소 2개)', '下のリストから比較するタイトルを選択 (2タイトル以上)')}
            </span>
          ) : (
            compareList.map((title) => (
              <span
                key={title}
                className="px-2 py-0.5 rounded-full text-[12px] font-medium"
                style={{ background: 'var(--color-glass)', color: 'var(--color-text-primary)' }}
              >
                {title.length > 20 ? title.slice(0, 20) + '…' : title}
                <button
                  onClick={() => toggleCompare(title)}
                  className="ml-1 cursor-pointer"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
        <motion.button
          whileHover={{ scale: compareList.length >= 2 ? 1.05 : 1 }}
          whileTap={{ scale: compareList.length >= 2 ? 0.95 : 1 }}
          onClick={() => setShowCompare(true)}
          disabled={compareList.length < 2}
          className="px-4 py-2 rounded-lg text-[13px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          style={{ background: '#1A2B5E', color: '#fff' }}
        >
          <GitCompare size={14} />
          {t('비교하기', '比較する')}
        </motion.button>
      </motion.div>

      {/* Compare chart */}
      {showCompare && compareList.length >= 2 && (
        <CompareChart
          selectedTitles={compareList}
          onClose={() => setShowCompare(false)}
          t={t}
          launchDates={new Map(compareList.map((jp) => [jp, masterMap.get(jp)?.service_launch_date ?? null]))}
        />
      )}

      {/* Filter card */}
      <div className="rounded-2xl p-4 mb-4" style={GLASS_CARD}>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder={t('작품명 검색 (JP / KR)...', 'タイトル検索 (JP / KR)...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#1A2B5E]/50"
            style={{
              background: 'var(--color-input-bg)',
              border: '1px solid var(--color-input-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none"
            style={{
              background: 'var(--color-input-bg)',
              border: '1px solid var(--color-input-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="">{t('플랫폼 전체', 'プラットフォーム全て')}</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none"
            style={{
              background: 'var(--color-input-bg)',
              border: '1px solid var(--color-input-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="">{t('장르 전체', 'ジャンル全て')}</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs focus:outline-none"
            style={{
              background: 'var(--color-input-bg)',
              border: '1px solid var(--color-input-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="">{t('제작사 전체', '制作会社全て')}</option>
            {companies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
            {filteredGrouped.length} / {groupedTitles.length}
          </span>
          <span>{t('개 작품', 'タイトル')}</span>
          {hasActiveFilter && (
            <button
              onClick={resetFilters}
              className="ml-auto px-3 py-1 rounded-lg text-[11px] font-medium"
              style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid var(--color-input-border)' }}
            >
              {t('필터 초기화', 'フィルターリセット')}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-2xl p-8 text-center" style={GLASS_CARD}>
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('로딩 중...', '読み込み中...')}
          </span>
        </div>
      ) : filteredGrouped.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={GLASS_CARD}>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {t('해당하는 작품이 없습니다', '該当するタイトルがありません')}
          </p>
          <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
            {t('필터를 조정해 보세요', 'フィルターを調整してみてください')}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl" style={GLASS_CARD}>
          <table className="w-full" style={{ minWidth: 800 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                {[
                  { label: '#', className: 'w-10 text-center' },
                  { label: '', className: 'w-8' },
                  { label: t('작품명', 'タイトル'), className: 'text-left', style: { width: '32%' } },
                  { label: t('장르', 'ジャンル'), className: 'text-left', style: { width: '14%' } },
                  { label: t('제작사', '制作会社'), className: 'text-left', style: { width: '16%' } },
                  { label: t('플랫폼', 'PF'), className: 'text-center', style: { width: '18%' } },
                  { label: t('매출', '売上'), className: 'text-right', style: { width: '15%' } },
                ].map((col, i) => (
                  <th
                    key={i}
                    className={`px-3 py-3 text-[13px] font-semibold whitespace-nowrap ${col.className ?? ''}`}
                    style={{
                      color: 'var(--color-text-secondary)',
                      background: 'var(--color-glass)',
                      ...((col as Record<string, unknown>).style as Record<string, string> ?? {}),
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredGrouped.slice(0, displayCount).map((group, idx) => {
                const mainProduct = group.products.find((p) => p.product_type === 'オリジナル') ?? group.products[0];
                const mainTitleJP = mainProduct?.title_jp ?? group.base_title;
                const isSelected = compareList.includes(mainTitleJP);
                const atLimit = !isSelected && compareList.length >= MAX_SELECT;

                return (
                  <tr
                    key={group.base_title}
                    className="transition-colors cursor-pointer"
                    style={{
                      borderBottom: '1px solid var(--color-glass-border)',
                      borderLeft: isSelected ? '3px solid var(--color-accent-blue, #3B6FF6)' : '3px solid transparent',
                      opacity: atLimit ? 0.4 : 1,
                    }}
                    onClick={() => {
                      if (atLimit) return;
                      toggleCompare(mainTitleJP);
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--color-glass)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <td className="px-3 py-3 text-center">
                      <span className="text-sm font-bold" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <div className="shrink-0">
                        {isSelected ? (
                          <CheckSquare size={16} color="#3B6FF6" />
                        ) : (
                          <Square size={16} color="var(--color-text-muted)" />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="min-w-0">
                        <span
                          className="text-sm font-bold truncate block"
                          title={group.base_title}
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {group.base_title}
                        </span>
                        {mainProduct?.title_kr && (
                          <p
                            className="text-[12px] truncate mt-0.5"
                            title={mainProduct.title_kr}
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            {mainProduct.title_kr}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {mainProduct?.genre_name || '-'}
                    </td>
                    <td className="px-3 py-3 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {mainProduct?.company_name || '-'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1 flex-wrap justify-center">
                        {group.channels.slice(0, 3).map((ch) => (
                          <PlatformBadge key={ch} name={ch} showName={false} size="sm" />
                        ))}
                        {group.channels.length > 3 && (
                          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                            +{group.channels.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {formatCurrency(group.total_sales)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredGrouped.length > displayCount && (
            <div className="px-4 py-2 text-[11px] text-center border-t" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-glass-border)' }}>
              {t(`상위 ${displayCount}개 표시 중 (총 ${filteredGrouped.length}개) - 필터로 좁혀보세요`, `上位${displayCount}件表示中 (全${filteredGrouped.length}件)`)}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
