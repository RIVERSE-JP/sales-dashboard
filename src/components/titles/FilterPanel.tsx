'use client';

// useState removed — filter always visible
import { motion } from 'framer-motion';
import { RotateCcw, Search, X } from 'lucide-react';
import { GLASS_CARD, cardVariants, SERIAL_STATUSES, CONTENT_FORMATS } from './constants';
import type { SalesPreset } from './constants';

interface FilterPanelProps {
  t: (ko: string, ja: string) => string;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  genres: Array<{ id: number; name: string }>;
  companies: string[];
  platforms: string[];
  selectedGenre: string;
  setSelectedGenre: (v: string) => void;
  selectedCompany: string;
  setSelectedCompany: (v: string) => void;
  selectedPlatform: string;
  setSelectedPlatform: (v: string) => void;
  selectedStatus: string;
  setSelectedStatus: (v: string) => void;
  selectedFormat: string;
  setSelectedFormat: (v: string) => void;
  salesPreset: SalesPreset;
  setSalesPreset: (v: SalesPreset) => void;
  serialStatusTab: string;
  setSerialStatusTab: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  onReset: () => void;
  filteredCount: number;
  totalCount: number;
}

const selectStyle: React.CSSProperties = {
  background: 'var(--color-glass)',
  color: 'var(--color-text-primary)',
  border: '1px solid var(--color-glass-border)',
  borderRadius: '8px',
  padding: '6px 10px',
  fontSize: '12px',
  outline: 'none',
  minWidth: 0,
};

const SALES_PRESET_LABELS: Record<SalesPreset, [string, string]> = {
  all: ['전체', '全体'],
  top10: ['상위 10%', '上位10%'],
  top50: ['상위 50%', '上位50%'],
  bottom50: ['하위 50%', '下位50%'],
};

const SORT_OPTIONS = [
  { value: 'sales_desc', ko: '매출 높은순', ja: '売上高い順' },
  { value: 'sales_asc', ko: '매출 낮은순', ja: '売上低い順' },
  { value: 'title_jp', ko: '작품명 (JP)', ja: 'タイトル名 (JP)' },
  { value: 'title_kr', ko: '작품명 (KR)', ja: 'タイトル名 (KR)' },
  { value: 'genre', ko: '장르별', ja: 'ジャンル別' },
  { value: 'company', ko: '제작사별', ja: '制作会社別' },
  { value: 'platforms', ko: '플랫폼 수', ja: 'プラットフォーム数' },
  { value: 'newest', ko: '최신순', ja: '新しい順' },
];

export function FilterPanel(props: FilterPanelProps) {
  const { t } = props;
  // expanded state removed — always visible

  const hasAdvancedFilter = props.selectedGenre || props.selectedCompany || props.selectedPlatform ||
    props.selectedStatus || props.selectedFormat || props.salesPreset !== 'all';

  const activeFilters: Array<{ label: string; onClear: () => void }> = [];
  if (props.selectedGenre) activeFilters.push({ label: `${t('장르', 'ジャンル')}: ${props.selectedGenre}`, onClear: () => props.setSelectedGenre('') });
  if (props.selectedCompany) activeFilters.push({ label: `${t('제작사', '制作会社')}: ${props.selectedCompany}`, onClear: () => props.setSelectedCompany('') });
  if (props.selectedPlatform) activeFilters.push({ label: `${t('플랫폼', 'PF')}: ${props.selectedPlatform}`, onClear: () => props.setSelectedPlatform('') });
  if (props.selectedStatus) activeFilters.push({ label: `${t('상태', '状態')}: ${props.selectedStatus}`, onClear: () => props.setSelectedStatus('') });
  if (props.selectedFormat) activeFilters.push({ label: `${t('포맷', 'フォーマット')}: ${props.selectedFormat}`, onClear: () => props.setSelectedFormat('') });
  if (props.salesPreset !== 'all') activeFilters.push({ label: `${t('매출', '売上')}: ${t(SALES_PRESET_LABELS[props.salesPreset][0], SALES_PRESET_LABELS[props.salesPreset][1])}`, onClear: () => props.setSalesPreset('all') });
  if (props.serialStatusTab !== 'all') activeFilters.push({ label: `${t('연재', '連載')}: ${props.serialStatusTab}`, onClear: () => props.setSerialStatusTab('all') });

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="show" className="space-y-3 mb-6">
      {/* Primary: Search + Sort */}
      <div className="rounded-2xl p-4" style={GLASS_CARD}>
        <div className="flex items-center gap-3">
          <Search size={18} color="var(--color-text-muted)" />
          <input
            type="text"
            placeholder={t('작품명으로 검색 (JP / KR)...', 'タイトル名で検索 (JP / KR)...')}
            value={props.searchQuery}
            onChange={(e) => props.setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--color-text-primary)' }}
          />
          {props.searchQuery && (
            <button onClick={() => props.setSearchQuery('')} className="text-xs cursor-pointer hover:underline" style={{ color: 'var(--color-text-secondary)' }}>
              {t('초기화', 'クリア')}
            </button>
          )}
          <div className="w-px h-5" style={{ background: 'var(--color-glass-border)' }} />
          <select
            value={props.sortBy}
            onChange={(e) => props.setSortBy(e.target.value)}
            style={{ ...selectStyle, border: 'none', background: 'transparent', fontSize: '12px' }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{t(opt.ko, opt.ja)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Panel (always visible) */}
      <div className="rounded-2xl p-4" style={GLASS_CARD}>
        {/* Filter Grid: 연재상태/장르/제작사/플랫폼/서비스형식 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <select value={props.serialStatusTab} onChange={(e) => props.setSerialStatusTab(e.target.value)} style={selectStyle}>
            <option value="all">{t('연재상태 전체', '連載状況全体')}</option>
            {SERIAL_STATUSES.map((s) => (
              <option key={s} value={s}>{
                s === '連載中' ? t('연재중', '連載中') :
                s === '完結' ? t('완결', '完結') :
                s === '休載中' ? t('휴재중', '休載中') :
                s === '未連載' ? t('미연재', '未連載') : s
              }</option>
            ))}
          </select>

          <select value={props.selectedGenre} onChange={(e) => props.setSelectedGenre(e.target.value)} style={selectStyle}>
            <option value="">{t('장르 전체', 'ジャンル全体')}</option>
            {props.genres.map((g) => (
              <option key={g.id} value={g.name}>{g.name}</option>
            ))}
          </select>

          <select value={props.selectedCompany} onChange={(e) => props.setSelectedCompany(e.target.value)} style={selectStyle}>
            <option value="">{t('제작사 전체', '制作会社全体')}</option>
            {props.companies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select value={props.selectedPlatform} onChange={(e) => props.setSelectedPlatform(e.target.value)} style={selectStyle}>
            <option value="">{t('플랫폼 전체', 'プラットフォーム全体')}</option>
            {props.platforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select value={props.selectedFormat} onChange={(e) => props.setSelectedFormat(e.target.value)} style={selectStyle}>
            <option value="">{t('서비스 형식', 'サービス形式')}</option>
            {CONTENT_FORMATS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {/* Reset */}
        {hasAdvancedFilter && (
          <div className="flex justify-end">
            <button
              onClick={props.onReset}
              className="flex items-center gap-1 text-xs cursor-pointer hover:underline px-3 py-1.5 rounded-lg transition-all"
              style={{ color: 'var(--color-text-muted)', background: 'var(--color-glass)' }}
            >
              <RotateCcw size={12} /> {t('필터 초기화', 'フィルターリセット')}
            </button>
          </div>
        )}
      </div>

      {/* Active Filter Tags */}
      {activeFilters.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 flex-wrap"
        >
          {activeFilters.map((f) => (
            <span
              key={f.label}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{
                background: 'var(--color-accent-blue, #818cf8)',
                color: '#fff',
              }}
            >
              {f.label}
              <button onClick={f.onClear} className="cursor-pointer hover:opacity-70 ml-0.5">
                <X size={11} />
              </button>
            </span>
          ))}
        </motion.div>
      )}

      {/* Count */}
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {props.filteredCount} / {props.totalCount} {t('개 작품', 'タイトル')}
        {props.searchQuery && ` ("${props.searchQuery}")`}
      </p>
    </motion.div>
  );
}
