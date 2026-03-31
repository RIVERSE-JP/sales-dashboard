'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Filter, Pencil, X, Check, Plus, Trash2, Layers, AlertTriangle,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { verifyPassword } from '@/utils/auth';

// ============================================================
// Types
// ============================================================

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

interface TitleRow {
  id: string;
  title_jp: string;
  title_kr: string | null;
  content_format: string | null;
  genre_id: number | null;
  production_company_id: number | null;
  distributor: string | null;
  serial_status: string | null;
  latest_episode_count: number | null;
  service_launch_date: string | null;
  completion_date: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  is_active: boolean;
  genres?: { code: string; name_jp: string; name_kr: string } | null;
  production_companies?: { name: string } | null;
}

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

const EMPTY_CELL_BG = 'rgba(245, 158, 11, 0.1)';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

// ============================================================
// Constants
// ============================================================

const PAGE_SIZE = 50;

const FORMAT_OPTIONS = ['WEBTOON', 'PAGETOON', 'NOVEL'];
const STATUS_OPTIONS = ['連載中', '完結', '休載', '未定'];

// ============================================================
// Toast
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
      {type === 'success' ? <Check size={16} /> : <X size={16} />}
      {message}
    </motion.div>
  );
}

// ============================================================
// Edit Modal
// ============================================================

function EditModal({
  title,
  field,
  currentValue,
  fieldType,
  options,
  onSave,
  onClose,
  t,
}: {
  title: string;
  field: string;
  currentValue: string;
  fieldType: 'text' | 'select' | 'date';
  options?: { value: string; label: string }[];
  onSave: (value: string) => void;
  onClose: () => void;
  t: (kr: string, jp: string) => string;
}) {
  const [value, setValue] = useState(currentValue);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    onSave(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="rounded-2xl p-6 max-w-sm w-full mx-4"
        style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-glass-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>{field}</p>

        {fieldType === 'select' ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)' }}
          >
            <option value="">-</option>
            {options?.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={fieldType}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)' }}
          />
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
            style={{ background: 'var(--color-input-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-input-border)' }}
          >
            {t('취소', 'キャンセル')}
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)' }}
          >
            {t('저장', '保存')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Skeleton
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

export default function TitleMasterTab() {
  const { t } = useApp();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TitleRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formatFilter, setFormatFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Sort
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Master data for filters
  const [genres, setGenres] = useState<Genre[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title_jp: '', title_kr: '', content_format: 'WEBTOON' });
  const [createSaving, setCreateSaving] = useState(false);

  // Batch edit modal
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchUpdates, setBatchUpdates] = useState<Record<string, string | boolean | null>>({});

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // Edit modal
  const [editModal, setEditModal] = useState<{
    row: TitleRow;
    field: string;
    dbField: string;
    currentValue: string;
    fieldType: 'text' | 'select' | 'date';
    options?: { value: string; label: string }[];
  } | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load genres & companies
  useEffect(() => {
    fetch('/api/manage/genres')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setGenres(d); })
      .catch(console.error);
    fetch('/api/manage/companies')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setCompanies(d); })
      .catch(console.error);
  }, []);

  const loadPage = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sortBy,
      sortDir,
    });
    if (search) params.set('search', search);
    if (genreFilter) params.set('genre', genreFilter);
    if (companyFilter) params.set('company', companyFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (formatFilter) params.set('format', formatFilter);

    try {
      const res = await fetch(`/api/manage/titles?${params}`);
      const data = await res.json();
      setRows(data.rows ?? []);
      setTotalCount(data.count ?? 0);
    } catch (err) {
      console.error('Failed to load titles:', err);
    }
    setLoading(false);
  }, [page, search, genreFilter, companyFilter, statusFilter, formatFilter, sortBy, sortDir]);

  useEffect(() => { void loadPage(); }, [loadPage]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, genreFilter, companyFilter, statusFilter, formatFilter, sortBy, sortDir]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  // Save edit
  const handleSave = async (value: string) => {
    if (!verifyPassword(t)) return;
    if (!editModal) return;
    const { row, dbField } = editModal;

    try {
      const body: Record<string, unknown> = { id: row.id };

      if (dbField === 'genre_id' || dbField === 'production_company_id') {
        body[dbField] = value ? Number(value) : null;
      } else if (dbField === 'is_active') {
        body[dbField] = value === 'true';
      } else {
        body[dbField] = value || null;
      }

      const res = await fetch('/api/manage/titles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Update failed');
      setToast({ message: t('수정 완료', '更新しました'), type: 'success' });
      setEditModal(null);
      void loadPage();
    } catch {
      setToast({ message: t('수정 실패', '更新に失敗しました'), type: 'error' });
    }
  };

  // Selection helpers
  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map(r => r.id)));
  };
  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Create title
  const handleCreate = async () => {
    if (!verifyPassword(t)) return;
    if (!createForm.title_jp.trim()) return;
    setCreateSaving(true);
    try {
      const res = await fetch('/api/manage/titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...createForm, is_active: true }),
      });
      if (!res.ok) throw new Error('Create failed');
      setToast({ message: t('작품 등록 완료', 'タイトルを登録しました'), type: 'success' });
      setCreateOpen(false);
      setCreateForm({ title_jp: '', title_kr: '', content_format: 'WEBTOON' });
      void loadPage();
    } catch {
      setToast({ message: t('등록 실패', '登録に失敗しました'), type: 'error' });
    }
    setCreateSaving(false);
  };

  // Delete selected
  const handleDeleteSelected = () => {
    if (!verifyPassword(t)) return;
    if (selected.size === 0) return;
    setConfirmDialog({
      message: t(`${selected.size}개 작품을 삭제하시겠습니까?`, `${selected.size}件のタイトルを削除しますか？`),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch('/api/manage/titles', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(selected) }),
          });
          if (!res.ok) throw new Error('Delete failed');
          setToast({ message: t(`${selected.size}개 삭제 완료`, `${selected.size}件削除しました`), type: 'success' });
          setSelected(new Set());
          void loadPage();
        } catch {
          setToast({ message: t('삭제 실패', '削除に失敗しました'), type: 'error' });
        }
      },
    });
  };

  // Batch update
  const handleBatchSave = async () => {
    if (!verifyPassword(t)) return;
    const ids = Array.from(selected);
    const updates: Record<string, unknown> = {};
    if (batchUpdates.serial_status) updates.serial_status = batchUpdates.serial_status;
    if (batchUpdates.genre_id) updates.genre_id = Number(batchUpdates.genre_id);
    if (batchUpdates.production_company_id) updates.production_company_id = Number(batchUpdates.production_company_id);
    if (batchUpdates.content_format) updates.content_format = batchUpdates.content_format;
    if (batchUpdates.is_active !== undefined && batchUpdates.is_active !== null) {
      updates.is_active = batchUpdates.is_active === 'true' || batchUpdates.is_active === true;
    }
    if (Object.keys(updates).length === 0) return;
    try {
      const res = await fetch('/api/manage/titles/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, updates }),
      });
      if (!res.ok) throw new Error('Batch update failed');
      setToast({ message: t('일괄 수정 완료', '一括更新しました'), type: 'success' });
      setBatchOpen(false);
      setBatchUpdates({});
      setSelected(new Set());
      void loadPage();
    } catch {
      setToast({ message: t('일괄 수정 실패', '一括更新に失敗しました'), type: 'error' });
    }
  };

  // Editable cell helper
  const isEmpty = (val: unknown) => val === null || val === undefined || val === '';

  const EditableCell = ({
    row,
    displayValue,
    dbField,
    fieldLabel,
    fieldType = 'text',
    options,
    align = 'left',
    highlight = false,
  }: {
    row: TitleRow;
    displayValue: string;
    dbField: string;
    fieldLabel: string;
    fieldType?: 'text' | 'select' | 'date';
    options?: { value: string; label: string }[];
    align?: 'left' | 'center' | 'right';
    highlight?: boolean;
  }) => {
    const currentRawValue = (() => {
      if (dbField === 'genre_id') return row.genre_id ? String(row.genre_id) : '';
      if (dbField === 'production_company_id') return row.production_company_id ? String(row.production_company_id) : '';
      if (dbField === 'is_active') return String(row.is_active);
      return String((row as unknown as Record<string, unknown>)[dbField] ?? '');
    })();

    return (
      <td
        className={`py-3 px-2 text-${align} group cursor-pointer`}
        style={{
          background: highlight ? EMPTY_CELL_BG : undefined,
          color: 'var(--color-text-primary)',
        }}
        onClick={() =>
          setEditModal({
            row,
            field: fieldLabel,
            dbField,
            currentValue: currentRawValue,
            fieldType,
            options,
          })
        }
      >
        <span className="inline-flex items-center gap-1">
          <span className={`truncate ${highlight ? 'italic' : ''}`} style={{ maxWidth: '160px', color: highlight ? 'rgba(245, 158, 11, 0.7)' : undefined }}>
            {displayValue || '-'}
          </span>
          <Pencil size={11} className="opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" />
        </span>
      </td>
    );
  };

  // Column definitions
  const columns = [
    { key: 'title_jp', label: t('작품명(JP)', 'タイトル(JP)'), align: 'left' as const },
    { key: 'title_kr', label: t('작품명(KR)', 'タイトル(KR)'), align: 'left' as const },
    { key: 'genre_id', label: t('장르', 'ジャンル'), align: 'left' as const },
    { key: 'production_company_id', label: t('제작사', '制作会社'), align: 'left' as const },
    { key: 'distributor', label: t('유통사', '配信社'), align: 'left' as const },
    { key: 'content_format', label: t('포맷', 'フォーマット'), align: 'center' as const },
    { key: 'serial_status', label: t('연재상태', '連載状態'), align: 'center' as const },
    { key: 'latest_episode_count', label: t('에피소드', 'EP数'), align: 'right' as const },
    { key: 'service_launch_date', label: t('개시일', '開始日'), align: 'center' as const },
    { key: 'completion_date', label: t('완결일', '完結日'), align: 'center' as const },
    { key: 'contract_start_date', label: t('계약시작', '契約開始'), align: 'center' as const },
    { key: 'contract_end_date', label: t('계약종료', '契約終了'), align: 'center' as const },
    { key: 'is_active', label: t('활성', '有効'), align: 'center' as const },
  ];

  const genreOptions = genres.map((g) => ({ value: String(g.id), label: g.name_kr || g.name_jp || g.code }));
  const companyOptions = companies.map((c) => ({ value: String(c.id), label: c.name }));

  return (
    <>
      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editModal && (
          <EditModal
            title={editModal.row.title_jp}
            field={editModal.field}
            currentValue={editModal.currentValue}
            fieldType={editModal.fieldType}
            options={editModal.options}
            onSave={handleSave}
            onClose={() => setEditModal(null)}
            t={t}
          />
        )}
      </AnimatePresence>

      {/* Confirm Dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setConfirmDialog(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-2xl p-6 max-w-sm w-full mx-4"
              style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-glass-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{confirmDialog.message}</p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
                  style={{ background: 'var(--color-input-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-input-border)' }}
                >
                  {t('취소', 'キャンセル')}
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                >
                  {t('확인', '確認')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {createOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setCreateOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-2xl p-6 max-w-md w-full mx-4"
              style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-glass-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                {t('작품 등록', '新規タイトル登録')}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    {t('작품명 (JP)', 'タイトル (JP)')} *
                  </label>
                  <input
                    value={createForm.title_jp}
                    onChange={(e) => setCreateForm(f => ({ ...f, title_jp: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)' }}
                    placeholder={t('일본어 작품명', '日本語タイトル')}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    {t('작품명 (KR)', 'タイトル (KR)')}
                  </label>
                  <input
                    value={createForm.title_kr}
                    onChange={(e) => setCreateForm(f => ({ ...f, title_kr: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)' }}
                    placeholder={t('한국어 작품명', '韓国語タイトル')}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    {t('포맷', 'フォーマット')}
                  </label>
                  <select
                    value={createForm.content_format}
                    onChange={(e) => setCreateForm(f => ({ ...f, content_format: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
                    style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)' }}
                  >
                    {FORMAT_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
                  style={{ background: 'var(--color-input-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-input-border)' }}
                >
                  {t('취소', 'キャンセル')}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={createSaving || !createForm.title_jp.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'var(--color-accent-blue)', color: '#fff', border: 'none' }}
                >
                  {createSaving ? t('등록 중...', '登録中...') : t('등록', '登録')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch Edit Modal */}
      <AnimatePresence>
        {batchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setBatchOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-2xl p-6 max-w-md w-full mx-4"
              style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-glass-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                {t('일괄 수정', '一括編集')}
              </h3>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                {selected.size}{t('개 작품에 적용', '件のタイトルに適用')}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>{t('연재상태', '連載状態')}</label>
                  <select
                    value={(batchUpdates.serial_status as string) || ''}
                    onChange={(e) => setBatchUpdates(u => ({ ...u, serial_status: e.target.value || null }))}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
                    style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="">{t('변경 안함', '変更なし')}</option>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>{t('장르', 'ジャンル')}</label>
                  <select
                    value={(batchUpdates.genre_id as string) || ''}
                    onChange={(e) => setBatchUpdates(u => ({ ...u, genre_id: e.target.value || null }))}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
                    style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="">{t('변경 안함', '変更なし')}</option>
                    {genres.map(g => <option key={g.id} value={g.id}>{g.name_kr || g.name_jp || g.code}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text-muted)' }}>{t('활성 여부', '有効状態')}</label>
                  <select
                    value={batchUpdates.is_active !== undefined && batchUpdates.is_active !== null ? String(batchUpdates.is_active) : ''}
                    onChange={(e) => setBatchUpdates(u => ({ ...u, is_active: e.target.value || null }))}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
                    style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="">{t('변경 안함', '変更なし')}</option>
                    <option value="true">{t('활성', '有効')}</option>
                    <option value="false">{t('비활성', '無効')}</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => setBatchOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
                  style={{ background: 'var(--color-input-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-input-border)' }}
                >
                  {t('취소', 'キャンセル')}
                </button>
                <button
                  onClick={handleBatchSave}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  style={{ background: 'var(--color-accent-blue)', color: '#fff', border: 'none' }}
                >
                  {t('적용', '適用')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
        {/* Action bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <>
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  {selected.size}{t('건 선택', '件選択')}
                </span>
                <button
                  onClick={() => { setBatchUpdates({}); setBatchOpen(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)' }}
                >
                  <Layers size={12} />
                  {t('일괄 수정', '一括編集')}
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                >
                  <Trash2 size={12} />
                  {t('삭제', '削除')}
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs cursor-pointer"
                  style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none' }}
                >
                  {t('선택 해제', '選択解除')}
                </button>
              </>
            )}
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all"
            style={{ background: 'var(--color-accent-blue)', color: '#fff', border: 'none' }}
          >
            <Plus size={16} />
            {t('작품 등록', '新規登録')}
          </button>
        </div>

        {/* Filters */}
        <motion.div variants={cardVariants} className="rounded-2xl p-4" style={GLASS_CARD}>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[200px]" style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)' }}>
              <Search size={14} color="var(--color-text-muted)" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('작품명 검색...', 'タイトル検索...')}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--color-text-primary)' }}
              />
              {search && (
                <button onClick={() => setSearch('')} className="cursor-pointer">
                  <X size={14} color="var(--color-text-muted)" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer"
              style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)' }}
            >
              <Filter size={14} color="var(--color-text-secondary)" />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('필터', 'フィルター')}</span>
              {showFilters ? <ChevronUp size={12} color="var(--color-text-secondary)" /> : <ChevronDown size={12} color="var(--color-text-secondary)" />}
            </button>
          </div>

          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4"
            >
              {/* Genre */}
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{t('장르', 'ジャンル')}</label>
                <select
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
                  style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)' }}
                >
                  <option value="">{t('전체', 'すべて')}</option>
                  {genres.map((g) => (
                    <option key={g.id} value={g.id}>{g.name_kr || g.name_jp || g.code}</option>
                  ))}
                </select>
              </div>

              {/* Company */}
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{t('제작사', '制作会社')}</label>
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
                  style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)' }}
                >
                  <option value="">{t('전체', 'すべて')}</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{t('연재상태', '連載状態')}</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
                  style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)' }}
                >
                  <option value="">{t('전체', 'すべて')}</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Format */}
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{t('포맷', 'フォーマット')}</label>
                <select
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
                  style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text-primary)' }}
                >
                  <option value="">{t('전체', 'すべて')}</option>
                  {FORMAT_OPTIONS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Summary bar */}
        <motion.div variants={cardVariants} className="flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <span>{totalCount.toLocaleString()} {t('건', '件')}</span>
          <span>Page {page} / {Math.max(totalPages, 1)}</span>
        </motion.div>

        {/* Table */}
        {loading ? (
          <TableSkeleton />
        ) : (
          <motion.div variants={cardVariants} className="rounded-2xl p-4 overflow-x-auto" style={GLASS_CARD}>
            <table className="w-full text-sm min-w-[1400px] table-striped">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-table-border)' }}>
                  <th className="py-3 px-2 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded cursor-pointer accent-blue-600"
                    />
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`py-3 px-2 font-medium cursor-pointer select-none text-${col.align} whitespace-nowrap`}
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
                  const genreDisplay = row.genres?.name_kr || row.genres?.name_jp || '';
                  const companyDisplay = row.production_companies?.name || '';
                  const isSelected = selected.has(row.id);

                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: '1px solid var(--color-table-border-subtle)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.05)' : undefined,
                      }}
                      className="hover:bg-[var(--color-glass)]"
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(row.id)}
                          className="w-4 h-4 rounded cursor-pointer accent-blue-600"
                        />
                      </td>
                      {/* title_jp */}
                      <td className="py-3 px-2" style={{ maxWidth: '200px' }}>
                        <p className="font-medium truncate" title={row.title_jp} style={{ color: 'var(--color-text-primary)' }}>{row.title_jp}</p>
                      </td>

                      {/* title_kr */}
                      <td className="py-3 px-2" style={{ maxWidth: '180px', background: isEmpty(row.title_kr) ? EMPTY_CELL_BG : undefined }}>
                        <p className="text-xs truncate" title={row.title_kr ?? ''} style={{ color: isEmpty(row.title_kr) ? 'rgba(245, 158, 11, 0.7)' : 'var(--color-text-muted)' }}>
                          {row.title_kr || '-'}
                        </p>
                      </td>

                      {/* genre */}
                      <EditableCell
                        row={row}
                        displayValue={genreDisplay}
                        dbField="genre_id"
                        fieldLabel={t('장르', 'ジャンル')}
                        fieldType="select"
                        options={genreOptions}
                        highlight={isEmpty(row.genre_id)}
                      />

                      {/* company */}
                      <EditableCell
                        row={row}
                        displayValue={companyDisplay}
                        dbField="production_company_id"
                        fieldLabel={t('제작사', '制作会社')}
                        fieldType="select"
                        options={companyOptions}
                        highlight={isEmpty(row.production_company_id)}
                      />

                      {/* distributor */}
                      <EditableCell
                        row={row}
                        displayValue={row.distributor || ''}
                        dbField="distributor"
                        fieldLabel={t('유통사', '配信社')}
                        highlight={isEmpty(row.distributor)}
                      />

                      {/* format */}
                      <EditableCell
                        row={row}
                        displayValue={row.content_format || ''}
                        dbField="content_format"
                        fieldLabel={t('포맷', 'フォーマット')}
                        fieldType="select"
                        options={FORMAT_OPTIONS.map((f) => ({ value: f, label: f }))}
                        align="center"
                        highlight={isEmpty(row.content_format)}
                      />

                      {/* serial status */}
                      <EditableCell
                        row={row}
                        displayValue={row.serial_status || ''}
                        dbField="serial_status"
                        fieldLabel={t('연재상태', '連載状態')}
                        fieldType="select"
                        options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                        align="center"
                        highlight={isEmpty(row.serial_status)}
                      />

                      {/* episode count */}
                      <td className="py-3 px-2 text-right font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {row.latest_episode_count ?? '-'}
                      </td>

                      {/* service launch date */}
                      <EditableCell
                        row={row}
                        displayValue={row.service_launch_date || ''}
                        dbField="service_launch_date"
                        fieldLabel={t('서비스 개시일', 'サービス開始日')}
                        fieldType="date"
                        align="center"
                        highlight={isEmpty(row.service_launch_date)}
                      />

                      {/* completion date */}
                      <EditableCell
                        row={row}
                        displayValue={row.completion_date || ''}
                        dbField="completion_date"
                        fieldLabel={t('완결일', '完結日')}
                        fieldType="date"
                        align="center"
                      />

                      {/* contract start */}
                      <EditableCell
                        row={row}
                        displayValue={row.contract_start_date || ''}
                        dbField="contract_start_date"
                        fieldLabel={t('계약 시작일', '契約開始日')}
                        fieldType="date"
                        align="center"
                      />

                      {/* contract end */}
                      <EditableCell
                        row={row}
                        displayValue={row.contract_end_date || ''}
                        dbField="contract_end_date"
                        fieldLabel={t('계약 종료일', '契約終了日')}
                        fieldType="date"
                        align="center"
                      />

                      {/* is_active */}
                      <EditableCell
                        row={row}
                        displayValue={row.is_active ? 'Y' : 'N'}
                        dbField="is_active"
                        fieldLabel={t('활성 여부', '有効状態')}
                        fieldType="select"
                        options={[{ value: 'true', label: 'Y' }, { value: 'false', label: 'N' }]}
                        align="center"
                      />
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
              disabled={page <= 1}
              onClick={() => setPage(Math.max(1, page - 1))}
              className="p-2 rounded-xl cursor-pointer transition-all"
              style={{ ...GLASS_CARD, opacity: page <= 1 ? 0.3 : 1 }}
            >
              <ChevronLeft size={16} color="var(--color-text-secondary)" />
            </motion.button>

            {(() => {
              const buttons: number[] = [];
              const start = Math.max(1, page - 2);
              const end = Math.min(totalPages, page + 2);
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
                  {p}
                </button>
              ));
            })()}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={page >= totalPages}
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              className="p-2 rounded-xl cursor-pointer transition-all"
              style={{ ...GLASS_CARD, opacity: page >= totalPages ? 0.3 : 1 }}
            >
              <ChevronRight size={16} color="var(--color-text-secondary)" />
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
