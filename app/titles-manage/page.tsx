'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Trash2, ToggleLeft, CheckSquare, Square,
  ChevronLeft, ChevronRight, X, AlertTriangle, ArrowUpDown,
  ArrowUp, ArrowDown, Layers, Save, Loader2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { GLASS_CARD } from '@/lib/design-tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Genre {
  id: number;
  code: string;
  name_jp: string;
  name_kr: string;
}

interface Company {
  id: number;
  name: string;
}

interface Platform {
  id: number;
  code: string;
  name_jp: string;
  name_kr: string;
}

interface TitleRow {
  id: string;
  title_jp: string;
  title_kr: string | null;
  content_format: string | null;
  content_type: string | null;
  genre_id: number | null;
  production_company_id: number | null;
  serial_status: string | null;
  latest_episode_count: number | null;
  contract_start: string | null;
  contract_end: string | null;
  is_active: boolean;
  illustrator_name: string | null;
  illustrator_yomi: string | null;
  screenwriter_name: string | null;
  screenwriter_yomi: string | null;
  original_author_name: string | null;
  original_author_yomi: string | null;
  rental_price: number | null;
  purchase_price: number | null;
  free_episodes: number | null;
  paid_episodes: number | null;
  distribution_scope: string | null;
  exclusive_until: string | null;
  genres?: { code: string; name_jp: string; name_kr: string } | null;
  production_companies?: { name: string } | null;
}

interface TitlePlatform {
  platform_id: number;
  launch_date: string | null;
  platforms?: { code: string; name_jp: string; name_kr: string };
}

type SortDir = 'asc' | 'desc';
type ModalTab = 'basic' | 'staff' | 'contract' | 'price' | 'platforms';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const SERIAL_STATUSES = [
  { value: 'ongoing', ko: '연재중', ja: '連載中' },
  { value: 'completed', ko: '완결', ja: '完結' },
  { value: 'hiatus', ko: '휴재', ja: '休載' },
  { value: 'preparing', ko: '준비중', ja: '準備中' },
];

const CONTENT_FORMATS = [
  { value: 'WEBTOON', label: 'Webtoon' },
  { value: 'PAGETOON', label: 'Pagetoon' },
  { value: 'NOVEL', label: 'Novel' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const emptyForm = (): Partial<TitleRow> => ({
  title_jp: '',
  title_kr: '',
  content_format: 'WEBTOON',
  content_type: '',
  genre_id: null,
  production_company_id: null,
  serial_status: 'ongoing',
  latest_episode_count: null,
  contract_start: null,
  contract_end: null,
  is_active: true,
  illustrator_name: null,
  illustrator_yomi: null,
  screenwriter_name: null,
  screenwriter_yomi: null,
  original_author_name: null,
  original_author_yomi: null,
  rental_price: null,
  purchase_price: null,
  free_episodes: null,
  paid_episodes: null,
  distribution_scope: null,
  exclusive_until: null,
});

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function TitlesManagePage() {
  const { t, lang } = useApp();

  // Data
  const [rows, setRows] = useState<TitleRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFormat, setFilterFormat] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalTab, setModalTab] = useState<ModalTab>('basic');
  const [form, setForm] = useState<Partial<TitleRow>>(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Batch modal
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchUpdates, setBatchUpdates] = useState<Record<string, string | boolean | null>>({});

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'deactivate'>('delete');

  // Platform mapping in edit modal
  const [titlePlatforms, setTitlePlatforms] = useState<TitlePlatform[]>([]);

  // ---------------------------------------------------------------------------
  // Fetchers
  // ---------------------------------------------------------------------------

  const fetchTitles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sortBy,
        sortDir,
      });
      if (search) params.set('search', search);
      if (filterGenre) params.set('genre', filterGenre);
      if (filterCompany) params.set('company', filterCompany);
      if (filterStatus) params.set('status', filterStatus);
      if (filterFormat) params.set('format', filterFormat);
      if (filterActive) params.set('active', filterActive);

      const res = await fetch(`/api/manage/titles?${params}`);
      if (!res.ok) throw new Error('Failed to fetch titles');
      const data = await res.json();
      setRows(data.rows || []);
      setTotalCount(data.count || 0);
    } catch {
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterGenre, filterCompany, filterStatus, filterFormat, filterActive, sortBy, sortDir]);

  const fetchMeta = useCallback(async () => {
    try {
      const [genresRes, companiesRes, platformsRes] = await Promise.all([
        fetch('/api/sales/genres').then(r => r.ok ? r.json() : []),
        fetch('/api/sales/title-master').then(async r => {
          if (!r.ok) return [];
          const titles = await r.json();
          const compMap = new Map<number, string>();
          for (const t of titles) {
            if (t.production_company_id && t.production_companies?.name) {
              compMap.set(t.production_company_id, t.production_companies.name);
            }
          }
          return Array.from(compMap.entries()).map(([id, name]) => ({ id, name }));
        }),
        fetch('/api/sales/platforms').then(r => r.ok ? r.json() : []),
      ]);
      setGenres(genresRes || []);
      setCompanies(companiesRes || []);
      setPlatforms(platformsRes || []);
    } catch {
      // graceful fallback
    }
  }, []);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);
  useEffect(() => { fetchTitles(); }, [fetchTitles]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  // ---------------------------------------------------------------------------
  // Sort handler
  // ---------------------------------------------------------------------------

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
    setPage(1);
  };

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map(r => r.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  const openCreate = () => {
    setForm(emptyForm());
    setEditId(null);
    setModalMode('create');
    setModalTab('basic');
    setTitlePlatforms([]);
    setModalOpen(true);
  };

  const openEdit = async (row: TitleRow) => {
    setForm({ ...row });
    setEditId(row.id);
    setModalMode('edit');
    setModalTab('basic');
    setModalOpen(true);
    // fetch platforms for this title
    try {
      const res = await fetch(`/api/manage/titles/${row.id}/platforms`);
      if (res.ok) setTitlePlatforms(await res.json());
      else setTitlePlatforms([]);
    } catch {
      setTitlePlatforms([]);
    }
  };

  const saveTitle = async () => {
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { genres, production_companies, id: _formId, ...payload } = form as TitleRow;
      if (modalMode === 'create') {
        const res = await fetch('/api/manage/titles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Create failed');
      } else {
        const res = await fetch('/api/manage/titles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editId, ...payload }),
        });
        if (!res.ok) throw new Error('Update failed');
      }
      setModalOpen(false);
      fetchTitles();
    } catch {
      // keep modal open on error
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    setConfirmAction('delete');
    setConfirmOpen(true);
  };

  const confirmDeactivate = () => {
    setConfirmAction('deactivate');
    setConfirmOpen(true);
  };

  const executeConfirm = async () => {
    const ids = Array.from(selected);
    if (confirmAction === 'delete') {
      await fetch('/api/manage/titles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
    } else {
      await fetch('/api/manage/titles/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, updates: { is_active: false } }),
      });
    }
    setConfirmOpen(false);
    setSelected(new Set());
    fetchTitles();
  };

  const saveBatch = async () => {
    const ids = Array.from(selected);
    const updates: Record<string, unknown> = {};
    if (batchUpdates.serial_status) updates.serial_status = batchUpdates.serial_status;
    if (batchUpdates.genre_id) updates.genre_id = batchUpdates.genre_id;
    if (batchUpdates.is_active !== undefined && batchUpdates.is_active !== null) {
      updates.is_active = batchUpdates.is_active === 'true' || batchUpdates.is_active === true;
    }
    if (Object.keys(updates).length === 0) return;

    await fetch('/api/manage/titles/batch', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, updates }),
    });
    setBatchOpen(false);
    setBatchUpdates({});
    setSelected(new Set());
    fetchTitles();
  };

  // Platform mapping
  const togglePlatform = async (platformId: number) => {
    if (!editId) return;
    const existing = titlePlatforms.find(tp => tp.platform_id === platformId);
    if (existing) {
      await fetch(`/api/manage/titles/${editId}/platforms`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform_id: platformId }),
      });
      setTitlePlatforms(prev => prev.filter(tp => tp.platform_id !== platformId));
    } else {
      const res = await fetch(`/api/manage/titles/${editId}/platforms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform_id: platformId }),
      });
      if (res.ok) {
        const data = await res.json();
        setTitlePlatforms(prev => [...prev, data]);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Expiring titles warning
  // ---------------------------------------------------------------------------

  const expiringTitles = useMemo(() => {
    return rows.filter(r => {
      const d = daysUntil(r.contract_end);
      return d !== null && d >= 0 && d <= 30;
    });
  }, [rows]);

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const genreName = (row: TitleRow) => {
    if (row.genres) return lang === 'ko' ? row.genres.name_kr : row.genres.name_jp;
    return '-';
  };

  const companyName = (row: TitleRow) => row.production_companies?.name || '-';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1
          className="text-xl font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('작품 관리', 'タイトル管理')}
        </h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer"
          style={{
            background: 'var(--color-accent-blue)',
            color: '#fff',
            border: 'none',
          }}
        >
          <Plus size={16} />
          {t('작품 등록', '新規登録')}
        </button>
      </div>

      {/* Expiring warning banner */}
      <AnimatePresence>
        {expiringTitles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl p-3 flex items-start gap-3"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>
                {t('계약 만료 임박', '契約満了間近')} ({expiringTitles.length}{t('건', '件')})
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {expiringTitles.map(r => r.title_jp).join(', ')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div
        className="rounded-xl p-4 flex flex-wrap gap-3 items-end"
        style={GLASS_CARD}
      >
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
            {t('작품명 검색', 'タイトル検索')}
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={t('작품명 입력...', 'タイトル入力...')}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
              style={{
                background: 'var(--color-input-bg, rgba(255,255,255,0.06))',
                border: '1px solid var(--color-glass-border)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Genre filter */}
        <FilterSelect
          label={t('장르', 'ジャンル')}
          value={filterGenre}
          onChange={v => { setFilterGenre(v); setPage(1); }}
          options={genres.map(g => ({ value: String(g.id), label: lang === 'ko' ? g.name_kr : g.name_jp }))}
          allLabel={t('전체', '全て')}
        />

        {/* Company filter */}
        <FilterSelect
          label={t('제작사', '制作会社')}
          value={filterCompany}
          onChange={v => { setFilterCompany(v); setPage(1); }}
          options={companies.map(c => ({ value: String(c.id), label: c.name }))}
          allLabel={t('전체', '全て')}
        />

        {/* Status filter */}
        <FilterSelect
          label={t('연재상태', '連載状態')}
          value={filterStatus}
          onChange={v => { setFilterStatus(v); setPage(1); }}
          options={SERIAL_STATUSES.map(s => ({ value: s.value, label: t(s.ko, s.ja) }))}
          allLabel={t('전체', '全て')}
        />

        {/* Format filter */}
        <FilterSelect
          label={t('포맷', 'フォーマット')}
          value={filterFormat}
          onChange={v => { setFilterFormat(v); setPage(1); }}
          options={CONTENT_FORMATS.map(f => ({ value: f.value, label: f.label }))}
          allLabel={t('전체', '全て')}
        />

        {/* Active filter */}
        <FilterSelect
          label={t('활성여부', '有効')}
          value={filterActive}
          onChange={v => { setFilterActive(v); setPage(1); }}
          options={[
            { value: 'true', label: t('활성', '有効') },
            { value: 'false', label: t('비활성', '無効') },
          ]}
          allLabel={t('전체', '全て')}
        />
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 flex-wrap"
        >
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {selected.size}{t('건 선택', '件選択')}
          </span>
          <button onClick={() => { setBatchUpdates({}); setBatchOpen(true); }} className="bulk-btn" style={bulkBtnStyle('#3B6FF6')}>
            <Layers size={14} /> {t('일괄 수정', '一括編集')}
          </button>
          <button onClick={confirmDeactivate} className="bulk-btn" style={bulkBtnStyle('#f59e0b')}>
            <ToggleLeft size={14} /> {t('비활성화', '無効化')}
          </button>
          <button onClick={confirmDelete} className="bulk-btn" style={bulkBtnStyle('#ef4444')}>
            <Trash2 size={14} /> {t('삭제', '削除')}
          </button>
        </motion.div>
      )}

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={GLASS_CARD}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                <Th>
                  <button onClick={toggleAll} className="p-0.5 cursor-pointer" style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)' }}>
                    {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </Th>
                <ThSort col="title_jp" label={t('작품명(JP)', 'タイトル(JP)')} sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <ThSort col="title_kr" label={t('작품명(KR)', 'タイトル(KR)')} sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <ThSort col="content_format" label={t('포맷', 'フォーマット')} sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <Th>{t('장르', 'ジャンル')}</Th>
                <Th>{t('제작사', '制作会社')}</Th>
                <ThSort col="serial_status" label={t('연재상태', '連載状態')} sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <ThSort col="latest_episode_count" label={t('에피소드', 'エピソード')} sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <Th>{t('계약기간', '契約期間')}</Th>
                <ThSort col="is_active" label={t('활성', '有効')} sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 rounded skeleton-shimmer" style={{ width: j === 0 ? 20 : '80%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
                    {t('데이터가 없습니다', 'データがありません')}
                  </td>
                </tr>
              ) : (
                rows.map(row => {
                  const isSelected = selected.has(row.id);
                  const expDays = daysUntil(row.contract_end);
                  const expiring = expDays !== null && expDays >= 0 && expDays <= 30;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => openEdit(row)}
                      className="cursor-pointer transition-colors duration-150"
                      style={{
                        borderBottom: '1px solid var(--color-glass-border)',
                        background: isSelected ? 'rgba(59,111,246,0.08)' : 'transparent',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = isSelected ? 'rgba(59,111,246,0.08)' : 'transparent';
                      }}
                    >
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleOne(row.id)} className="p-0.5 cursor-pointer" style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)' }}>
                          {isSelected ? <CheckSquare size={16} style={{ color: 'var(--color-accent-blue)' }} /> : <Square size={16} />}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 font-medium whitespace-nowrap" style={{ color: 'var(--color-text-primary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.title_jp}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--color-text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.title_kr || '-'}
                      </td>
                      <td className="px-3 py-2.5">
                        <FormatBadge format={row.content_format} />
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                        {genreName(row)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                        {companyName(row)}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={row.serial_status} t={t} />
                      </td>
                      <td className="px-3 py-2.5 text-center" style={{ color: 'var(--color-text-secondary)' }}>
                        {row.latest_episode_count ?? '-'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">
                            {row.contract_start ? row.contract_start.slice(0, 10) : '-'} ~ {row.contract_end ? row.contract_end.slice(0, 10) : '-'}
                          </span>
                          {expiring && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
                            >
                              {t('만료임박', '満了間近')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ background: row.is_active ? '#10b981' : '#6b7280' }}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderTop: '1px solid var(--color-glass-border)' }}
        >
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {t('총', '合計')} {totalCount}{t('건', '件')}
          </span>
          <div className="flex items-center gap-1">
            <PaginationBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft size={14} />
            </PaginationBtn>
            <span className="text-xs px-3" style={{ color: 'var(--color-text-secondary)' }}>
              {page} / {totalPages}
            </span>
            <PaginationBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <ChevronRight size={14} />
            </PaginationBtn>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Edit/Create Modal */}
      {/* ================================================================ */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-x-4 bottom-0 top-16 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[680px] md:max-h-[85vh] z-50 flex flex-col rounded-t-2xl md:rounded-2xl overflow-hidden"
              style={{
                background: 'var(--color-background)',
                border: '1px solid var(--color-glass-border)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
              }}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {modalMode === 'create' ? t('작품 등록', '新規登録') : t('작품 수정', 'タイトル編集')}
                </h2>
                <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg cursor-pointer" style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)' }}>
                  <X size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-0 px-5 pt-3 shrink-0" style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                {(
                  [
                    { id: 'basic' as ModalTab, ko: '기본 정보', ja: '基本情報' },
                    { id: 'staff' as ModalTab, ko: '제작진', ja: 'スタッフ' },
                    { id: 'contract' as ModalTab, ko: '계약/배포', ja: '契約/配信' },
                    { id: 'price' as ModalTab, ko: '가격', ja: '価格' },
                    ...(modalMode === 'edit' ? [{ id: 'platforms' as ModalTab, ko: '플랫폼', ja: 'プラットフォーム' }] : []),
                  ] as { id: ModalTab; ko: string; ja: string }[]
                ).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setModalTab(tab.id)}
                    className="px-3 pb-2.5 text-xs font-semibold transition-colors cursor-pointer"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: modalTab === tab.id ? 'var(--color-accent-blue)' : 'var(--color-text-muted)',
                      borderBottom: modalTab === tab.id ? '2px solid var(--color-accent-blue)' : '2px solid transparent',
                    }}
                  >
                    {t(tab.ko, tab.ja)}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={modalTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {modalTab === 'basic' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label={t('작품명 (JP)', 'タイトル (JP)')} required>
                          <input
                            value={form.title_jp || ''}
                            onChange={e => setForm(f => ({ ...f, title_jp: e.target.value }))}
                            className="form-input"
                            style={inputStyle}
                          />
                        </FormField>
                        <FormField label={t('작품명 (KR)', 'タイトル (KR)')}>
                          <input
                            value={form.title_kr || ''}
                            onChange={e => setForm(f => ({ ...f, title_kr: e.target.value }))}
                            className="form-input"
                            style={inputStyle}
                          />
                        </FormField>
                        <FormField label={t('포맷', 'フォーマット')}>
                          <select
                            value={form.content_format || ''}
                            onChange={e => setForm(f => ({ ...f, content_format: e.target.value }))}
                            style={inputStyle}
                          >
                            {CONTENT_FORMATS.map(f => (
                              <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                          </select>
                        </FormField>
                        <FormField label={t('콘텐츠 유형', 'コンテンツ種別')}>
                          <input
                            value={form.content_type || ''}
                            onChange={e => setForm(f => ({ ...f, content_type: e.target.value }))}
                            style={inputStyle}
                          />
                        </FormField>
                        <FormField label={t('장르', 'ジャンル')}>
                          <select
                            value={form.genre_id ?? ''}
                            onChange={e => setForm(f => ({ ...f, genre_id: e.target.value ? Number(e.target.value) : null }))}
                            style={inputStyle}
                          >
                            <option value="">{t('선택', '選択')}</option>
                            {genres.map(g => (
                              <option key={g.id} value={g.id}>{lang === 'ko' ? g.name_kr : g.name_jp}</option>
                            ))}
                          </select>
                        </FormField>
                        <FormField label={t('제작사', '制作会社')}>
                          <select
                            value={form.production_company_id ?? ''}
                            onChange={e => setForm(f => ({ ...f, production_company_id: e.target.value ? Number(e.target.value) : null }))}
                            style={inputStyle}
                          >
                            <option value="">{t('선택', '選択')}</option>
                            {companies.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </FormField>
                        <FormField label={t('연재상태', '連載状態')}>
                          <select
                            value={form.serial_status || ''}
                            onChange={e => setForm(f => ({ ...f, serial_status: e.target.value }))}
                            style={inputStyle}
                          >
                            {SERIAL_STATUSES.map(s => (
                              <option key={s.value} value={s.value}>{t(s.ko, s.ja)}</option>
                            ))}
                          </select>
                        </FormField>
                        <FormField label={t('에피소드 수', 'エピソード数')}>
                          <input
                            type="number"
                            value={form.latest_episode_count ?? ''}
                            onChange={e => setForm(f => ({ ...f, latest_episode_count: e.target.value ? Number(e.target.value) : null }))}
                            style={inputStyle}
                          />
                        </FormField>
                      </div>
                    )}

                    {modalTab === 'staff' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label={t('일러스트레이터', 'イラストレーター')}>
                          <input value={form.illustrator_name || ''} onChange={e => setForm(f => ({ ...f, illustrator_name: e.target.value }))} style={inputStyle} />
                        </FormField>
                        <FormField label={t('요미', 'ヨミ')}>
                          <input value={form.illustrator_yomi || ''} onChange={e => setForm(f => ({ ...f, illustrator_yomi: e.target.value }))} style={inputStyle} />
                        </FormField>
                        <FormField label={t('각본가', '脚本家')}>
                          <input value={form.screenwriter_name || ''} onChange={e => setForm(f => ({ ...f, screenwriter_name: e.target.value }))} style={inputStyle} />
                        </FormField>
                        <FormField label={t('요미', 'ヨミ')}>
                          <input value={form.screenwriter_yomi || ''} onChange={e => setForm(f => ({ ...f, screenwriter_yomi: e.target.value }))} style={inputStyle} />
                        </FormField>
                        <FormField label={t('원작자', '原作者')}>
                          <input value={form.original_author_name || ''} onChange={e => setForm(f => ({ ...f, original_author_name: e.target.value }))} style={inputStyle} />
                        </FormField>
                        <FormField label={t('요미', 'ヨミ')}>
                          <input value={form.original_author_yomi || ''} onChange={e => setForm(f => ({ ...f, original_author_yomi: e.target.value }))} style={inputStyle} />
                        </FormField>
                      </div>
                    )}

                    {modalTab === 'contract' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label={t('계약 시작일', '契約開始日')}>
                          <input type="date" value={form.contract_start || ''} onChange={e => setForm(f => ({ ...f, contract_start: e.target.value || null }))} style={inputStyle} />
                        </FormField>
                        <FormField label={t('계약 종료일', '契約終了日')}>
                          <input type="date" value={form.contract_end || ''} onChange={e => setForm(f => ({ ...f, contract_end: e.target.value || null }))} style={inputStyle} />
                        </FormField>
                        <FormField label={t('배포범위', '配信範囲')}>
                          <input value={form.distribution_scope || ''} onChange={e => setForm(f => ({ ...f, distribution_scope: e.target.value }))} style={inputStyle} placeholder={t('예: 일본 전역', '例: 日本全域')} />
                        </FormField>
                        <FormField label={t('독점 전환일', '独占切替日')}>
                          <input type="date" value={form.exclusive_until || ''} onChange={e => setForm(f => ({ ...f, exclusive_until: e.target.value || null }))} style={inputStyle} />
                        </FormField>
                        <FormField label={t('활성여부', '有効')}>
                          <select
                            value={form.is_active ? 'true' : 'false'}
                            onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}
                            style={inputStyle}
                          >
                            <option value="true">{t('활성', '有効')}</option>
                            <option value="false">{t('비활성', '無効')}</option>
                          </select>
                        </FormField>
                      </div>
                    )}

                    {modalTab === 'price' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label={t('렌탈 가격', 'レンタル価格')}>
                          <input type="number" value={form.rental_price ?? ''} onChange={e => setForm(f => ({ ...f, rental_price: e.target.value ? Number(e.target.value) : null }))} style={inputStyle} />
                        </FormField>
                        <FormField label={t('구매 가격', '購入価格')}>
                          <input type="number" value={form.purchase_price ?? ''} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value ? Number(e.target.value) : null }))} style={inputStyle} />
                        </FormField>
                        <FormField label={t('무료 화수', '無料話数')}>
                          <input type="number" value={form.free_episodes ?? ''} onChange={e => setForm(f => ({ ...f, free_episodes: e.target.value ? Number(e.target.value) : null }))} style={inputStyle} />
                        </FormField>
                        <FormField label={t('유료 화수', '有料話数')}>
                          <input type="number" value={form.paid_episodes ?? ''} onChange={e => setForm(f => ({ ...f, paid_episodes: e.target.value ? Number(e.target.value) : null }))} style={inputStyle} />
                        </FormField>
                      </div>
                    )}

                    {modalTab === 'platforms' && modalMode === 'edit' && (
                      <div className="space-y-3">
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {t('플랫폼을 선택/해제하여 매핑을 관리합니다.', 'プラットフォームを選択/解除してマッピングを管理します。')}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {platforms.map(p => {
                            const mapped = titlePlatforms.find(tp => tp.platform_id === p.id);
                            return (
                              <div
                                key={p.id}
                                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                                style={{
                                  background: mapped ? 'rgba(59,111,246,0.08)' : 'var(--color-glass)',
                                  border: `1px solid ${mapped ? 'rgba(59,111,246,0.3)' : 'var(--color-glass-border)'}`,
                                }}
                                onClick={() => togglePlatform(p.id)}
                              >
                                <div style={{ color: mapped ? 'var(--color-accent-blue)' : 'var(--color-text-muted)' }}>
                                  {mapped ? <CheckSquare size={16} /> : <Square size={16} />}
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                    {lang === 'ko' ? (p.name_kr || p.code) : (p.name_jp || p.code)}
                                  </div>
                                  {mapped?.launch_date && (
                                    <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                                      {t('출시', '配信')}: {mapped.launch_date}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-end gap-3 px-5 py-4 shrink-0" style={{ borderTop: '1px solid var(--color-glass-border)' }}>
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
                  style={{ background: 'transparent', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-secondary)' }}
                >
                  {t('취소', 'キャンセル')}
                </button>
                <button
                  onClick={saveTitle}
                  disabled={saving || !form.title_jp}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
                  style={{ background: 'var(--color-accent-blue)', color: '#fff', border: 'none' }}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {t('저장', '保存')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* Batch Edit Modal */}
      {/* ================================================================ */}
      <AnimatePresence>
        {batchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setBatchOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[400px] max-w-[90vw] rounded-2xl p-5"
              style={{
                background: 'var(--color-background)',
                border: '1px solid var(--color-glass-border)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
              }}
            >
              <h3 className="text-base font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                {t('일괄 수정', '一括編集')} ({selected.size}{t('건', '件')})
              </h3>
              <div className="space-y-3">
                <FormField label={t('연재상태', '連載状態')}>
                  <select
                    value={(batchUpdates.serial_status as string) || ''}
                    onChange={e => setBatchUpdates(u => ({ ...u, serial_status: e.target.value || null }))}
                    style={inputStyle}
                  >
                    <option value="">{t('변경없음', '変更なし')}</option>
                    {SERIAL_STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{t(s.ko, s.ja)}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label={t('장르', 'ジャンル')}>
                  <select
                    value={(batchUpdates.genre_id as string) || ''}
                    onChange={e => setBatchUpdates(u => ({ ...u, genre_id: e.target.value || null }))}
                    style={inputStyle}
                  >
                    <option value="">{t('변경없음', '変更なし')}</option>
                    {genres.map(g => (
                      <option key={g.id} value={g.id}>{lang === 'ko' ? g.name_kr : g.name_jp}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label={t('활성여부', '有効')}>
                  <select
                    value={batchUpdates.is_active === undefined || batchUpdates.is_active === null ? '' : String(batchUpdates.is_active)}
                    onChange={e => setBatchUpdates(u => ({ ...u, is_active: e.target.value || null }))}
                    style={inputStyle}
                  >
                    <option value="">{t('변경없음', '変更なし')}</option>
                    <option value="true">{t('활성', '有効')}</option>
                    <option value="false">{t('비활성', '無効')}</option>
                  </select>
                </FormField>
              </div>
              <div className="flex justify-end gap-3 mt-5">
                <button onClick={() => setBatchOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer" style={{ background: 'transparent', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-secondary)' }}>
                  {t('취소', 'キャンセル')}
                </button>
                <button onClick={saveBatch} className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer" style={{ background: 'var(--color-accent-blue)', color: '#fff', border: 'none' }}>
                  {t('적용', '適用')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* Confirm Dialog */}
      {/* ================================================================ */}
      <AnimatePresence>
        {confirmOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setConfirmOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[380px] max-w-[90vw] rounded-2xl p-5"
              style={{
                background: 'var(--color-background)',
                border: '1px solid var(--color-glass-border)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <AlertTriangle size={20} style={{ color: '#ef4444' }} />
                </div>
                <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {confirmAction === 'delete' ? t('삭제 확인', '削除確認') : t('비활성화 확인', '無効化確認')}
                </h3>
              </div>
              <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
                {selected.size}{t('건의 작품을 ', '件のタイトルを')}
                {confirmAction === 'delete' ? t('삭제', '削除') : t('비활성화', '無効化')}
                {t('하시겠습니까? 이 작업은 되돌릴 수 없습니다.', 'しますか？この操作は元に戻せません。')}
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer" style={{ background: 'transparent', border: '1px solid var(--color-glass-border)', color: 'var(--color-text-secondary)' }}>
                  {t('취소', 'キャンセル')}
                </button>
                <button
                  onClick={executeConfirm}
                  className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                  style={{
                    background: confirmAction === 'delete' ? '#ef4444' : '#f59e0b',
                    color: '#fff',
                    border: 'none',
                  }}
                >
                  {confirmAction === 'delete' ? t('삭제', '削除') : t('비활성화', '無効化')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '13px',
  background: 'var(--color-input-bg, rgba(255,255,255,0.06))',
  border: '1px solid var(--color-glass-border)',
  color: 'var(--color-text-primary)',
  outline: 'none',
};

function bulkBtnStyle(color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    background: `${color}15`,
    color,
    border: `1px solid ${color}30`,
  };
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
      style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-glass-border)' }}
    >
      {children}
    </th>
  );
}

function ThSort({ col, label, sortBy, sortDir, onSort }: {
  col: string; label: string; sortBy: string; sortDir: SortDir; onSort: (col: string) => void;
}) {
  const isActive = sortBy === col;
  return (
    <th
      className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none"
      style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-glass-border)' }}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive
          ? (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)
          : <ArrowUpDown size={12} className="opacity-30" />
        }
      </span>
    </th>
  );
}

function FilterSelect({ label, value, onChange, options, allLabel }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <div className="min-w-[120px]">
      <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          ...inputStyle,
          padding: '7px 10px',
        }}
      >
        <option value="">{allLabel}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function FormatBadge({ format }: { format: string | null }) {
  const colors: Record<string, string> = {
    WEBTOON: '#3B6FF6',
    PAGETOON: '#f472b6',
    NOVEL: '#34d399',
  };
  const color = colors[format || ''] || 'var(--color-text-muted)';
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: `${color}18`, color }}
    >
      {format || '-'}
    </span>
  );
}

function StatusBadge({ status, t }: { status: string | null; t: (ko: string, ja: string) => string }) {
  const found = SERIAL_STATUSES.find(s => s.value === status);
  const colors: Record<string, string> = {
    ongoing: '#10b981',
    completed: '#6b7280',
    hiatus: '#f59e0b',
    preparing: '#3b82f6',
  };
  const color = colors[status || ''] || 'var(--color-text-muted)';
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: `${color}18`, color }}
    >
      {found ? t(found.ko, found.ja) : status || '-'}
    </span>
  );
}

function PaginationBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-default"
      style={{
        background: 'var(--color-glass)',
        border: '1px solid var(--color-glass-border)',
        color: 'var(--color-text-secondary)',
      }}
    >
      {children}
    </button>
  );
}
