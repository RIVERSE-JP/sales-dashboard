'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Search, Download, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Loader2, Filter, Trash2, CheckCircle, X,
} from 'lucide-react';
import { fetchDailySalesPage, fetchAllDailySales } from '@/lib/supabase';
import { generateDailyRawExcel } from '@/utils/dailyRawExporter';
import type { DailySale } from '@/types';
import { getPlatformBrand } from '@/utils/platformConfig';
import { PlatformBadge } from '@/components/PlatformBadge';
import { useApp } from '@/context/AppContext';
import dynamic from 'next/dynamic';

const TitleMasterTab = dynamic(() => import('@/components/data/TitleMasterTab'), { ssr: false });
const MasterSettingsTab = dynamic(() => import('@/components/data/MasterSettingsTab'), { ssr: false });

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
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.2 },
  },
};

// ============================================================
// Toast Component
// ============================================================

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
      style={{
        background: type === 'success' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
        color: 'white',
        backdropFilter: 'blur(8px)',
      }}
    >
      {type === 'success' ? <CheckCircle size={16} /> : <X size={16} />}
      {message}
    </motion.div>
  );
}

// ============================================================
// Confirm Dialog
// ============================================================

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="rounded-2xl p-6 max-w-sm w-full mx-4"
        style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-glass-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-primary)' }}>{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
            style={{ background: 'var(--color-input-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-input-border)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
          >
            OK
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

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

export default function DataPage() {
  const { formatCurrency, t, theme } = useApp();

  // Tab state
  const [activeTab, setActiveTab] = useState<'sales' | 'titles' | 'settings'>('sales');

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

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Inline editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    fetch('/api/sales/platforms')
      .then((res) => res.json())
      .then((data: string[]) => {
        if (data) setPlatformNames(data);
      })
      .catch((err) => console.error('Failed to load platforms:', err));
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
    void loadPage();
  }, [loadPage]);

  // Reset to page 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [platformFilter, titleSearch, startDate, endDate, sortBy, sortDir]);

  // Focus edit input
  useEffect(() => {
    if (editingId !== null && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

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

  // ---- Selection ----
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  };

  // ---- Delete selected ----
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setConfirmDialog({
      message: t(`${selectedIds.size}건을 삭제하시겠습니까?`, `${selectedIds.size}件を削除しますか？`),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch('/api/manage/sales', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(selectedIds) }),
          });
          if (!res.ok) throw new Error('Delete failed');
          setToast({ message: t(`${selectedIds.size}건 삭제 완료`, `${selectedIds.size}件削除しました`), type: 'success' });
          setSelectedIds(new Set());
          void loadPage();
        } catch {
          setToast({ message: t('삭제 실패', '削除に失敗しました'), type: 'error' });
        }
      },
    });
  };

  // ---- Inline edit ----
  const startEdit = (row: DailySale) => {
    setEditingId(row.id);
    setEditValue(String(row.sales_amount));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (editingId === null) return;
    const newAmount = parseInt(editValue.replace(/[^0-9-]/g, ''), 10);
    if (isNaN(newAmount)) { cancelEdit(); return; }

    try {
      const res = await fetch('/api/manage/sales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, sales_amount: newAmount }),
      });
      if (!res.ok) throw new Error('Update failed');
      setRows((prev) => prev.map((r) => r.id === editingId ? { ...r, sales_amount: newAmount } : r));
      setHighlightedId(editingId);
      setTimeout(() => setHighlightedId(null), 2000);
      setToast({ message: t('수정 완료', '更新しました'), type: 'success' });
    } catch {
      setToast({ message: t('수정 실패', '更新に失敗しました'), type: 'error' });
    }
    cancelEdit();
  };

  // ---- Confirm sokuhochi ----
  const handleConfirm = (ids: number[]) => {
    setConfirmDialog({
      message: t(`${ids.length}건을 확정 처리하시겠습니까?`, `${ids.length}件を確定しますか？`),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch('/api/manage/sales/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
          });
          if (!res.ok) throw new Error('Confirm failed');
          setToast({ message: t('확정 완료', '確定しました'), type: 'success' });
          void loadPage();
        } catch {
          setToast({ message: t('확정 실패', '確定に失敗しました'), type: 'error' });
        }
      },
    });
  };

  // ---- Batch delete by filters (reserved for future use) ----
  // @ts-expect-error reserved for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleBatchDelete = (filter: { startDate?: string; endDate?: string; dataSource?: string; channel?: string }) => {
    setConfirmDialog({
      message: t('이 조건에 해당하는 데이터를 모두 삭제하시겠습니까?', 'この条件に該当するデータを全て削除しますか？'),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch('/api/manage/sales/batch-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(filter),
          });
          if (!res.ok) throw new Error('Batch delete failed');
          setToast({ message: t('일괄 삭제 완료', '一括削除しました'), type: 'success' });
          void loadPage();
        } catch {
          setToast({ message: t('일괄 삭제 실패', '一括削除に失敗しました'), type: 'error' });
        }
      },
    });
  };

  // Confirm selected sokuhochi rows
  const handleConfirmSelected = () => {
    const sokuhochiIds = rows
      .filter((r) => selectedIds.has(r.id) && r.data_source === 'sokuhochi')
      .map((r) => r.id);
    if (sokuhochiIds.length === 0) return;
    handleConfirm(sokuhochiIds);
  };

  // Date range summary
  const dateRange = rows.length > 0
    ? `${rows[rows.length - 1]?.sale_date ?? ''} ~ ${rows[0]?.sale_date ?? ''}`
    : '';

  const selectedSokuhochiCount = rows.filter((r) => selectedIds.has(r.id) && r.data_source === 'sokuhochi').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* Confirm Dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <ConfirmDialog
            message={confirmDialog.message}
            onConfirm={confirmDialog.onConfirm}
            onCancel={() => setConfirmDialog(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center page-icon-glow"
        >
          <Database size={20} color="white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('데이터베이스 관리', 'データベース管理')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('매출 원본, 작품 정보, 기본 설정 관리', '売上データ・作品情報・基本設定管理')}
          </p>
        </div>
        {activeTab === 'sales' && (
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
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)' }}>
        {([
          { key: 'sales' as const, label: t('매출 원본', '売上データ') },
          { key: 'titles' as const, label: t('작품 정보', '作品情報') },
          { key: 'settings' as const, label: t('기본 설정', '基本設定') },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all"
            style={{
              background: activeTab === tab.key ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === tab.key ? '#a5b4fc' : 'var(--color-text-muted)',
              border: activeTab === tab.key ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Title Master Tab */}
      {activeTab === 'titles' && <TitleMasterTab />}

      {/* Master Settings Tab */}
      {activeTab === 'settings' && <MasterSettingsTab />}

      {/* Sales Data Tab */}
      {activeTab === 'sales' && <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
        {/* Filters */}
        <motion.div variants={cardVariants} className="rounded-2xl p-4" style={GLASS_CARD}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 w-full text-left cursor-pointer"
          >
            <Filter size={16} color="var(--color-text-secondary)" />
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('필터', 'フィルター')}</span>
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
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{t('작품 검색', 'タイトル検索')}</label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)' }}>
                  <Search size={14} color="var(--color-text-muted)" />
                  <input
                    type="text"
                    value={titleSearch}
                    onChange={(e) => setTitleSearch(e.target.value)}
                    placeholder={t('작품명...', 'タイトル名...')}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: 'var(--color-text-primary)' }}
                  />
                </div>
              </div>

              {/* Platform */}
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{t('플랫폼', 'プラットフォーム')}</label>
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
                  style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)' }}
                >
                  <option value="">{t('전체', 'すべて')}</option>
                  {platformNames.map((p) => (
                    <option key={p} value={p}>{getPlatformBrand(p).nameJP || p}</option>
                  ))}
                </select>
              </div>

              {/* Start date */}
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{t('시작일', '開始日')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
                  style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)', colorScheme: theme === 'light' ? 'light' : 'dark' }}
                />
              </div>

              {/* End date */}
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{t('종료일', '終了日')}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
                  style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)', colorScheme: theme === 'light' ? 'light' : 'dark' }}
                />
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Toolbar - shown when items selected */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              variants={cardVariants}
              className="rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap"
              style={{ ...GLASS_CARD, border: '1px solid rgba(99, 102, 241, 0.3)' }}
            >
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {selectedIds.size}{t('건 선택', '件選択')}
              </span>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
              >
                <Trash2 size={12} />
                {t('삭제', '削除')}
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
                  {selectedIds.size}
                </span>
              </motion.button>

              {selectedSokuhochiCount > 0 && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleConfirmSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' }}
                >
                  <CheckCircle size={12} />
                  {t('확정', '確定')}
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
                    {selectedSokuhochiCount}
                  </span>
                </motion.button>
              )}

              <button
                onClick={() => setSelectedIds(new Set())}
                className="ml-auto text-xs cursor-pointer"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {t('선택 해제', '選択解除')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary bar */}
        <motion.div variants={cardVariants} className="flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <span>{totalCount.toLocaleString()} {t('건', '件')} {dateRange && `| ${dateRange}`}</span>
          <span>Page {page + 1} / {Math.max(totalPages, 1)}</span>
        </motion.div>

        {/* Data table */}
        {loading ? (
          <TableSkeleton />
        ) : (
          <motion.div variants={cardVariants} className="rounded-2xl p-4 overflow-x-auto" style={GLASS_CARD}>
            <table className="w-full text-sm min-w-[800px] table-striped">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-table-border)' }}>
                  {/* Checkbox header */}
                  <th className="py-3 px-2 w-10">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && selectedIds.size === rows.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded cursor-pointer accent-indigo-500"
                    />
                  </th>
                  {[
                    { key: 'sale_date', label: t('날짜', '日付'), align: 'left' as const },
                    { key: 'title_jp', label: t('작품(JP)', 'タイトル(JP)'), align: 'left' as const },
                    { key: 'title_kr', label: t('작품(KR)', 'タイトル(KR)'), align: 'left' as const },
                    { key: 'channel', label: 'PF', align: 'left' as const },
                    { key: 'sales_amount', label: t('매출', '売上'), align: 'right' as const },
                    { key: 'data_source', label: t('소스', 'ソース'), align: 'center' as const },
                    { key: '_actions', label: '', align: 'center' as const },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className={`py-3 px-2 font-medium ${col.key !== '_actions' ? 'cursor-pointer' : ''} select-none text-${col.align}`}
                      style={{ color: 'var(--color-text-secondary)' }}
                      onClick={() => col.key !== '_actions' && handleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label} {col.key !== '_actions' && <SortIcon col={col.key} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isEditing = editingId === row.id;
                  const isHighlighted = highlightedId === row.id;
                  const isSelected = selectedIds.has(row.id);

                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: '1px solid var(--color-table-border-subtle)',
                        background: isHighlighted
                          ? 'rgba(99, 102, 241, 0.1)'
                          : isSelected
                            ? 'rgba(99, 102, 241, 0.05)'
                            : undefined,
                        transition: 'background 0.3s',
                      }}
                      className="hover:bg-[var(--color-glass)]"
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(row.id)}
                          className="w-4 h-4 rounded cursor-pointer accent-indigo-500"
                        />
                      </td>
                      <td className="py-3 px-2 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{row.sale_date}</td>
                      <td className="py-3 px-2" style={{ maxWidth: '200px' }}>
                        <p className="font-medium truncate" title={row.title_jp} style={{ color: 'var(--color-text-primary)' }}>{row.title_jp}</p>
                      </td>
                      <td className="py-3 px-2" style={{ maxWidth: '180px' }}>
                        <p className="text-xs truncate" title={row.title_kr ?? '-'} style={{ color: 'var(--color-text-muted)' }}>{row.title_kr ?? '-'}</p>
                      </td>
                      <td className="py-3 px-2">
                        <PlatformBadge name={row.channel} showName={false} size="sm" />
                      </td>
                      {/* Sales amount - inline editable */}
                      <td
                        className="py-3 px-2 text-right font-mono font-semibold"
                        style={{ color: 'var(--color-text-primary)' }}
                        onDoubleClick={() => startEdit(row)}
                      >
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            onBlur={saveEdit}
                            className="w-full text-right text-sm font-mono font-semibold px-2 py-1 rounded-lg outline-none"
                            style={{
                              background: 'var(--color-input-bg)',
                              color: 'var(--color-text-primary)',
                              border: '2px solid rgba(99, 102, 241, 0.5)',
                            }}
                          />
                        ) : (
                          <span className="cursor-pointer hover:underline" title={t('더블클릭으로 수정', 'ダブルクリックで編集')}>
                            {formatCurrency(row.sales_amount)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{
                            background: row.data_source === 'sokuhochi' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                            color: row.data_source === 'sokuhochi' ? '#fbbf24' : '#818cf8',
                          }}
                        >
                          {row.data_source === 'weekly_report' ? 'WR' : row.data_source === 'sokuhochi' ? t('속보', '速報') : row.data_source}
                        </span>
                        {row.is_preliminary && (
                          <span className="ml-1 text-[10px] px-1 py-0.5 rounded" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                            {t('잠정', '暫定')}
                          </span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="py-3 px-2 text-center">
                        {row.data_source === 'sokuhochi' && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleConfirm([row.id])}
                            className="text-[10px] px-2 py-1 rounded-full font-semibold cursor-pointer"
                            style={{
                              background: 'rgba(34, 197, 94, 0.15)',
                              color: '#22c55e',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                            }}
                          >
                            {t('확정', '確定')}
                          </motion.button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {rows.length === 0 && (
              <p className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>{t('데이터가 없습니다', 'データがありません')}</p>
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
                  className="w-9 h-9 rounded-xl text-xs font-semibold cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
                  aria-label={`Page ${p + 1}`}
                  aria-current={p === page ? 'page' : undefined}
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
      </motion.div>}
    </motion.div>
  );
}
