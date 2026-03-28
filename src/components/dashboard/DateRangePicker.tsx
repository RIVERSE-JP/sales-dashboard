'use client';

import { useApp } from '@/context/AppContext';
import { GLASS_CARD } from './shared';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
}

function getPresetDates(preset: string): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = now.toISOString().slice(0, 10);

  switch (preset) {
    case 'this_month':
      return { start: `${y}-${String(m + 1).padStart(2, '0')}-01`, end: today };
    case 'last_month': {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      const lastDay = new Date(ly, lm + 1, 0).getDate();
      return {
        start: `${ly}-${String(lm + 1).padStart(2, '0')}-01`,
        end: `${ly}-${String(lm + 1).padStart(2, '0')}-${lastDay}`,
      };
    }
    case 'this_quarter': {
      const qStart = Math.floor(m / 3) * 3;
      return { start: `${y}-${String(qStart + 1).padStart(2, '0')}-01`, end: today };
    }
    case 'this_year':
      return { start: `${y}-01-01`, end: today };
    case 'all':
      return { start: '', end: '' };
    default:
      return { start: '', end: '' };
  }
}

export default function DateRangePicker({ startDate, endDate, onChangeStart, onChangeEnd }: DateRangePickerProps) {
  const { t } = useApp();

  const applyPreset = (preset: string) => {
    const { start, end } = getPresetDates(preset);
    onChangeStart(start);
    onChangeEnd(end);
  };

  const presets = [
    { key: 'this_month', label: t('이번달', '今月') },
    { key: 'last_month', label: t('지난달', '先月') },
    { key: 'this_quarter', label: t('이번분기', '今四半期') },
    { key: 'this_year', label: t('올해', '今年') },
    { key: 'all', label: t('전체', '全期間') },
  ];

  return (
    <div className="rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap" style={GLASS_CARD}>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onChangeStart(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-glass-border)',
            color: 'var(--color-text-primary)',
          }}
        />
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>~</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onChangeEnd(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-glass-border)',
            color: 'var(--color-text-primary)',
          }}
        />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {presets.map((p) => {
          const { start, end } = getPresetDates(p.key);
          const isActive = startDate === start && endDate === end;
          return (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: isActive
                  ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                  : 'var(--color-surface)',
                color: isActive ? '#fff' : 'var(--color-text-secondary)',
                border: isActive ? 'none' : '1px solid var(--color-glass-border)',
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
