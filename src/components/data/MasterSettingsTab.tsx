'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronUp, ChevronDown, Trash2, X, Merge, AlertTriangle } from 'lucide-react';
import { useApp } from '@/context/AppContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Platform {
  id: number;
  code: string;
  name_jp: string;
  name_kr: string;
  name_en: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

interface Genre {
  id: number;
  code: string;
  name_jp: string;
  name_kr: string;
}

interface Company {
  id: number;
  name: string;
  title_count: number;
}

type Tab = 'platforms' | 'genres' | 'companies';

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
const GLASS_CARD = {
  background: 'var(--color-glass)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid var(--color-glass-border)',
  borderRadius: '16px',
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function fetchJSON<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Toggle Switch
// ---------------------------------------------------------------------------
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
      style={{
        background: checked ? 'var(--color-accent-blue)' : 'var(--color-text-muted)',
        border: 'none',
        padding: 0,
      }}
    >
      <span
        className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200"
        style={{
          transform: checked ? 'translateX(21px)' : 'translateX(1px)',
          marginTop: '2px',
        }}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 bottom-4 top-auto md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[101] w-auto md:w-[480px] max-h-[85vh] overflow-y-auto"
            style={{
              ...GLASS_CARD,
              background: 'var(--color-surface)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            }}
          >
            <div className="flex items-center justify-between p-5 pb-3">
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[var(--color-glass-hover)] transition-colors cursor-pointer"
                style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Confirm Dialog
// ---------------------------------------------------------------------------
function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}) {
  const { t } = useApp();
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{message}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer"
            style={{
              background: 'var(--color-glass)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-glass-border)',
            }}
          >
            {t('취소', 'キャンセル')}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer"
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
            }}
          >
            {t('삭제', '削除')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Form Input
// ---------------------------------------------------------------------------
function FormInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]"
        style={{
          background: 'var(--color-glass)',
          border: '1px solid var(--color-glass-border)',
          color: 'var(--color-text-primary)',
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Platform Tab
// ---------------------------------------------------------------------------
function PlatformTab() {
  const { t } = useApp();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Platform | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Platform | null>(null);
  const [form, setForm] = useState({ code: '', name_jp: '', name_kr: '', name_en: '', color: '#3B6FF6', sort_order: 0 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchJSON<Platform[]>('/api/manage/platforms');
      setPlatforms(data);
    } catch {
      setPlatforms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setForm({ code: '', name_jp: '', name_kr: '', name_en: '', color: '#3B6FF6', sort_order: platforms.length + 1 });
    setModalOpen(true);
  }

  function openEdit(p: Platform) {
    setEditing(p);
    setForm({ code: p.code, name_jp: p.name_jp, name_kr: p.name_kr, name_en: p.name_en || '', color: p.color || '#3B6FF6', sort_order: p.sort_order });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await fetchJSON('/api/manage/platforms', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, ...form }),
        });
      } else {
        await fetchJSON('/api/manage/platforms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, is_active: true }),
        });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: Platform) {
    try {
      await fetchJSON(`/api/manage/platforms?id=${p.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  }

  async function handleToggle(p: Platform) {
    try {
      await fetchJSON('/api/manage/platforms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, is_active: !p.is_active }),
      });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  }

  async function handleReorder(p: Platform, direction: 'up' | 'down') {
    const idx = platforms.findIndex((x) => x.id === p.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= platforms.length) return;

    const other = platforms[swapIdx];
    try {
      await Promise.all([
        fetchJSON('/api/manage/platforms', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: p.id, sort_order: other.sort_order }),
        }),
        fetchJSON('/api/manage/platforms', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: other.id, sort_order: p.sort_order }),
        }),
      ]);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl skeleton-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer hover:brightness-110"
          style={{ background: 'var(--color-accent-blue)', color: '#fff', border: 'none' }}
        >
          <Plus size={16} />
          {t('추가', '追加')}
        </button>
      </div>

      <div className="overflow-x-auto" style={{ ...GLASS_CARD, padding: 0 }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
              {[t('순서','順序'), 'Code', t('일본어명','日本語名'), t('한국어명','韓国語名'), t('색상','色'), t('활성','有効'), t('정렬','並替'), t('작업','操作')].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {platforms.map((p, idx) => (
              <tr
                key={p.id}
                className="transition-colors hover:bg-[var(--color-glass-hover)] cursor-pointer"
                style={{ borderBottom: '1px solid var(--color-glass-border)' }}
                onClick={() => openEdit(p)}
              >
                <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{p.sort_order}</td>
                <td className="px-4 py-3 font-mono font-medium" style={{ color: 'var(--color-text-primary)' }}>{p.code}</td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-primary)' }}>{p.name_jp}</td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{p.name_kr}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-md border border-white/10"
                      style={{ background: p.color || '#888' }}
                    />
                    <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      {p.color || '-'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <ToggleSwitch checked={p.is_active} onChange={() => handleToggle(p)} />
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleReorder(p, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded-md transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-glass)]"
                      style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none' }}
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      onClick={() => handleReorder(p, 'down')}
                      disabled={idx === platforms.length - 1}
                      className="p-1 rounded-md transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-glass)]"
                      style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none' }}
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setDeleteTarget(p)}
                    className="p-1.5 rounded-md transition-colors cursor-pointer hover:bg-red-500/10"
                    style={{ color: '#ef4444', background: 'transparent', border: 'none' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {platforms.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {t('데이터 없음', 'データなし')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('플랫폼 수정', 'プラットフォーム編集') : t('플랫폼 추가', 'プラットフォーム追加')}
      >
        <div className="space-y-4">
          <FormInput label="Code" value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} placeholder="piccoma" />
          <FormInput label={t('일본어명', '日本語名')} value={form.name_jp} onChange={(v) => setForm((f) => ({ ...f, name_jp: v }))} placeholder="ピッコマ" />
          <FormInput label={t('한국어명', '韓国語名')} value={form.name_kr} onChange={(v) => setForm((f) => ({ ...f, name_kr: v }))} placeholder="피코마" />
          <FormInput label={t('영어명', '英語名')} value={form.name_en} onChange={(v) => setForm((f) => ({ ...f, name_en: v }))} placeholder="Piccoma" />
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
              {t('색상', '色')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                style={{ background: 'transparent' }}
              />
              <div
                className="flex-1 h-10 rounded-lg flex items-center justify-center text-sm font-medium"
                style={{ background: form.color, color: '#fff' }}
              >
                {form.color}
              </div>
            </div>
          </div>
          <FormInput
            label={t('정렬 순서', '並び順')}
            value={form.sort_order}
            onChange={(v) => setForm((f) => ({ ...f, sort_order: parseInt(v) || 0 }))}
            type="number"
          />
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors"
              style={{ background: 'var(--color-glass)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-glass-border)' }}
            >
              {t('취소', 'キャンセル')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.code || !form.name_jp}
              className="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-accent-blue)', color: '#fff', border: 'none' }}
            >
              {saving ? t('저장 중...', '保存中...') : t('저장', '保存')}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title={t('플랫폼 삭제', 'プラットフォーム削除')}
        message={t(
          `"${deleteTarget?.name_jp}" 플랫폼을 삭제하시겠습니까?`,
          `「${deleteTarget?.name_jp}」プラットフォームを削除しますか？`
        )}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Genre Tab
// ---------------------------------------------------------------------------
function GenreTab() {
  const { t } = useApp();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Genre | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Genre | null>(null);
  const [form, setForm] = useState({ code: '', name_jp: '', name_kr: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchJSON<Genre[]>('/api/manage/genres');
      setGenres(data);
    } catch {
      setGenres([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setForm({ code: '', name_jp: '', name_kr: '' });
    setModalOpen(true);
  }

  function openEdit(g: Genre) {
    setEditing(g);
    setForm({ code: g.code, name_jp: g.name_jp, name_kr: g.name_kr });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await fetchJSON('/api/manage/genres', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, ...form }),
        });
      } else {
        await fetchJSON('/api/manage/genres', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(g: Genre) {
    try {
      await fetchJSON(`/api/manage/genres?id=${g.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl skeleton-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer hover:brightness-110"
          style={{ background: 'var(--color-accent-blue)', color: '#fff', border: 'none' }}
        >
          <Plus size={16} />
          {t('추가', '追加')}
        </button>
      </div>

      <div className="overflow-x-auto" style={{ ...GLASS_CARD, padding: 0 }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
              {['Code', t('일본어명','日本語名'), t('한국어명','韓国語名'), t('작업','操作')].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {genres.map((g) => (
              <tr
                key={g.id}
                className="transition-colors hover:bg-[var(--color-glass-hover)] cursor-pointer"
                style={{ borderBottom: '1px solid var(--color-glass-border)' }}
                onClick={() => openEdit(g)}
              >
                <td className="px-4 py-3 font-mono font-medium" style={{ color: 'var(--color-text-primary)' }}>{g.code}</td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-primary)' }}>{g.name_jp}</td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{g.name_kr}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setDeleteTarget(g)}
                    className="p-1.5 rounded-md transition-colors cursor-pointer hover:bg-red-500/10"
                    style={{ color: '#ef4444', background: 'transparent', border: 'none' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {genres.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {t('데이터 없음', 'データなし')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('장르 수정', 'ジャンル編集') : t('장르 추가', 'ジャンル追加')}
      >
        <div className="space-y-4">
          <FormInput label="Code" value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} placeholder="romance" />
          <FormInput label={t('일본어명', '日本語名')} value={form.name_jp} onChange={(v) => setForm((f) => ({ ...f, name_jp: v }))} placeholder="ロマンス" />
          <FormInput label={t('한국어명', '韓国語名')} value={form.name_kr} onChange={(v) => setForm((f) => ({ ...f, name_kr: v }))} placeholder="로맨스" />
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors"
              style={{ background: 'var(--color-glass)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-glass-border)' }}
            >
              {t('취소', 'キャンセル')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.code}
              className="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-accent-blue)', color: '#fff', border: 'none' }}
            >
              {saving ? t('저장 중...', '保存中...') : t('저장', '保存')}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title={t('장르 삭제', 'ジャンル削除')}
        message={t(
          `"${deleteTarget?.name_jp || deleteTarget?.code}" 장르를 삭제하시겠습니까?`,
          `「${deleteTarget?.name_jp || deleteTarget?.code}」ジャンルを削除しますか？`
        )}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Company Tab
// ---------------------------------------------------------------------------
function CompanyTab() {
  const { t } = useApp();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [form, setForm] = useState({ name: '' });
  const [saving, setSaving] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelection, setMergeSelection] = useState<number[]>([]);
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchJSON<Company[]>('/api/manage/companies');
      setCompanies(data);
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setForm({ name: '' });
    setModalOpen(true);
  }

  function openEdit(c: Company) {
    if (mergeMode) return;
    setEditing(c);
    setForm({ name: c.name });
    setModalOpen(true);
  }

  function toggleMergeSelect(id: number) {
    setMergeSelection((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await fetchJSON('/api/manage/companies', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, name: form.name }),
        });
      } else {
        await fetchJSON('/api/manage/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name }),
        });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Company) {
    try {
      await fetchJSON(`/api/manage/companies?id=${c.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  }

  async function handleMerge() {
    if (mergeSelection.length !== 2) return;
    const [sourceId, targetId] = mergeSelection;
    try {
      await fetchJSON('/api/manage/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'merge', sourceId, targetId }),
      });
      setMergeMode(false);
      setMergeSelection([]);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  }

  const sourceCompany = companies.find((c) => c.id === mergeSelection[0]);
  const targetCompany = companies.find((c) => c.id === mergeSelection[1]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl skeleton-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {mergeMode && (
            <>
              <button
                onClick={() => { setMergeMode(false); setMergeSelection([]); }}
                className="px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors"
                style={{ background: 'var(--color-glass)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-glass-border)' }}
              >
                {t('취소', 'キャンセル')}
              </button>
              <button
                onClick={() => mergeSelection.length === 2 && setMergeConfirmOpen(true)}
                disabled={mergeSelection.length !== 2}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#f59e0b', color: '#fff', border: 'none' }}
              >
                <Merge size={16} />
                {t('병합 실행', 'マージ実行')}
              </button>
            </>
          )}
        </div>
        <div className="flex gap-2">
          {!mergeMode && (
            <button
              onClick={() => setMergeMode(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors"
              style={{ background: 'var(--color-glass)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-glass-border)' }}
            >
              <Merge size={16} />
              {t('병합', 'マージ')}
            </button>
          )}
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer hover:brightness-110"
            style={{ background: 'var(--color-accent-blue)', color: '#fff', border: 'none' }}
          >
            <Plus size={16} />
            {t('추가', '追加')}
          </button>
        </div>
      </div>

      {mergeMode && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b' }}
        >
          {t(
            '병합할 제작사 2개를 선택하세요. 첫 번째 → 두 번째로 병합됩니다.',
            'マージする制作会社を2つ選択してください。1つ目 → 2つ目に統合されます。'
          )}
          {mergeSelection.length === 2 && sourceCompany && targetCompany && (
            <div className="mt-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>
              "{sourceCompany.name}" → "{targetCompany.name}"
            </div>
          )}
        </motion.div>
      )}

      <div className="overflow-x-auto" style={{ ...GLASS_CARD, padding: 0 }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
              {mergeMode && (
                <th className="px-4 py-3 w-10" />
              )}
              {[t('제작사명','制作会社名'), t('작품 수','タイトル数'), t('작업','操作')].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => {
              const isSelected = mergeSelection.includes(c.id);
              const selIndex = mergeSelection.indexOf(c.id);
              return (
                <tr
                  key={c.id}
                  className="transition-colors hover:bg-[var(--color-glass-hover)] cursor-pointer"
                  style={{
                    borderBottom: '1px solid var(--color-glass-border)',
                    background: isSelected ? 'rgba(245, 158, 11, 0.08)' : undefined,
                  }}
                  onClick={() => mergeMode ? toggleMergeSelect(c.id) : openEdit(c)}
                >
                  {mergeMode && (
                    <td className="px-4 py-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: isSelected ? '#f59e0b' : 'var(--color-glass)',
                          color: isSelected ? '#fff' : 'var(--color-text-muted)',
                          border: isSelected ? 'none' : '1px solid var(--color-glass-border)',
                        }}
                      >
                        {isSelected ? selIndex + 1 : ''}
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{c.name}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                    <span
                      className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)' }}
                    >
                      {c.title_count}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setDeleteTarget(c)}
                      className="p-1.5 rounded-md transition-colors cursor-pointer hover:bg-red-500/10"
                      style={{ color: '#ef4444', background: 'transparent', border: 'none' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {companies.length === 0 && (
              <tr>
                <td colSpan={mergeMode ? 4 : 3} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {t('데이터 없음', 'データなし')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('제작사 수정', '制作会社編集') : t('제작사 추가', '制作会社追加')}
      >
        <div className="space-y-4">
          <FormInput label={t('제작사명', '制作会社名')} value={form.name} onChange={(v) => setForm({ name: v })} placeholder="Studio ABC" />
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors"
              style={{ background: 'var(--color-glass)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-glass-border)' }}
            >
              {t('취소', 'キャンセル')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name}
              className="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-accent-blue)', color: '#fff', border: 'none' }}
            >
              {saving ? t('저장 중...', '保存中...') : t('저장', '保存')}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title={t('제작사 삭제', '制作会社削除')}
        message={t(
          `"${deleteTarget?.name}" 제작사를 삭제하시겠습니까? 연결된 작품 ${deleteTarget?.title_count ?? 0}개가 있습니다.`,
          `「${deleteTarget?.name}」制作会社を削除しますか？ 関連タイトル${deleteTarget?.title_count ?? 0}件があります。`
        )}
      />

      {/* Merge confirm */}
      <Modal
        open={mergeConfirmOpen}
        onClose={() => setMergeConfirmOpen(false)}
        title={t('제작사 병합', '制作会社マージ')}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
            <div className="text-sm space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
              <p>
                {t(
                  `"${sourceCompany?.name}" (작품 ${sourceCompany?.title_count ?? 0}개)를 "${targetCompany?.name}" (작품 ${targetCompany?.title_count ?? 0}개)로 병합합니다.`,
                  `「${sourceCompany?.name}」（タイトル${sourceCompany?.title_count ?? 0}件）を「${targetCompany?.name}」（タイトル${targetCompany?.title_count ?? 0}件）に統合します。`
                )}
              </p>
              <p className="font-medium" style={{ color: '#f59e0b' }}>
                {t('이 작업은 되돌릴 수 없습니다.', 'この操作は元に戻せません。')}
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setMergeConfirmOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors"
              style={{ background: 'var(--color-glass)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-glass-border)' }}
            >
              {t('취소', 'キャンセル')}
            </button>
            <button
              onClick={() => { setMergeConfirmOpen(false); handleMerge(); }}
              className="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all hover:brightness-110"
              style={{ background: '#f59e0b', color: '#fff', border: 'none' }}
            >
              {t('병합 확인', 'マージ確認')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
const TABS: { key: Tab; ko: string; ja: string }[] = [
  { key: 'platforms', ko: '플랫폼', ja: 'プラットフォーム' },
  { key: 'genres', ko: '장르', ja: 'ジャンル' },
  { key: 'companies', ko: '제작사', ja: '制作会社' },
];

export default function MasterSettingsTab() {
  const { t } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('platforms');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Sub-header */}
      <div>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {t('플랫폼, 장르, 제작사 마스터 데이터를 관리합니다.', 'プラットフォーム、ジャンル、制作会社のマスターデータを管理します。')}
        </p>
      </div>

      {/* Tabs */}
      <div className="relative flex gap-1 p-1 rounded-xl" style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="relative flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer z-[1]"
            style={{
              background: 'transparent',
              color: activeTab === tab.key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              border: 'none',
            }}
          >
            {activeTab === tab.key && (
              <motion.div
                layoutId="master-settings-tab"
                className="absolute inset-0 rounded-lg"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-glass-border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-[1]">{t(tab.ko, tab.ja)}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'platforms' && <PlatformTab />}
          {activeTab === 'genres' && <GenreTab />}
          {activeTab === 'companies' && <CompanyTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
