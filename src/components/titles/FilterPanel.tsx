'use client';

import { motion } from 'framer-motion';
import { Filter, RotateCcw, Search } from 'lucide-react';
import { GLASS_CARD, cardVariants, SERIAL_STATUSES, CONTENT_FORMATS, SALES_PRESETS } from './constants';
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

export function FilterPanel(props: FilterPanelProps) {
  const { t } = props;
  const hasFilter = props.selectedGenre || props.selectedCompany || props.selectedPlatform ||
    props.selectedStatus || props.selectedFormat || props.salesPreset !== 'all' || props.searchQuery;

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="show" className="space-y-3 mb-6">
      {/* Search */}
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
        </div>
      </div>

      {/* Serial Status Tabs (B6) */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...SERIAL_STATUSES].map((status) => {
          const isActive = props.serialStatusTab === status;
          const label = status === 'all' ? t('전체', '全体') : status;
          return (
            <button
              key={status}
              onClick={() => props.setSerialStatusTab(status)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
              style={{
                background: isActive ? 'var(--color-accent-blue, #818cf8)' : 'var(--color-glass)',
                color: isActive ? '#fff' : 'var(--color-text-secondary)',
                border: `1px solid ${isActive ? 'transparent' : 'var(--color-glass-border)'}`,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Filter Dropdowns (B1) + Sales Preset (B2) */}
      <div className="rounded-2xl p-4" style={GLASS_CARD}>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} color="var(--color-text-muted)" />
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {t('필터', 'フィルター')}
          </span>
          {hasFilter && (
            <button onClick={props.onReset} className="ml-auto flex items-center gap-1 text-xs cursor-pointer hover:underline" style={{ color: 'var(--color-text-muted)' }}>
              <RotateCcw size={12} /> {t('초기화', 'リセット')}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Genre */}
          <select value={props.selectedGenre} onChange={(e) => props.setSelectedGenre(e.target.value)} style={selectStyle}>
            <option value="">{t('장르 전체', 'ジャンル全体')}</option>
            {props.genres.map((g) => (
              <option key={g.id} value={g.name}>{g.name}</option>
            ))}
          </select>

          {/* Company */}
          <select value={props.selectedCompany} onChange={(e) => props.setSelectedCompany(e.target.value)} style={selectStyle}>
            <option value="">{t('제작사 전체', '制作会社全体')}</option>
            {props.companies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Platform */}
          <select value={props.selectedPlatform} onChange={(e) => props.setSelectedPlatform(e.target.value)} style={selectStyle}>
            <option value="">{t('플랫폼 전체', 'プラットフォーム全体')}</option>
            {props.platforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Serial Status */}
          <select value={props.selectedStatus} onChange={(e) => props.setSelectedStatus(e.target.value)} style={selectStyle}>
            <option value="">{t('연재상태 전체', '連載状態全体')}</option>
            {SERIAL_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Content Format */}
          <select value={props.selectedFormat} onChange={(e) => props.setSelectedFormat(e.target.value)} style={selectStyle}>
            <option value="">{t('포맷 전체', 'フォーマット全体')}</option>
            {CONTENT_FORMATS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          {/* Sales Preset (B2) */}
          <select value={props.salesPreset} onChange={(e) => props.setSalesPreset(e.target.value as SalesPreset)} style={selectStyle}>
            {SALES_PRESETS.map((p) => (
              <option key={p} value={p}>{t(SALES_PRESET_LABELS[p][0], SALES_PRESET_LABELS[p][1])}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {props.filteredCount} / {props.totalCount} {t('개 작품', 'タイトル')}
        {props.searchQuery && ` ("${props.searchQuery}")`}
      </p>
    </motion.div>
  );
}
