'use client';

import { useApp } from '@/context/AppContext';
import { GLASS_CARD } from '@/lib/design-tokens';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  presets?: Array<{ label: string; getRange: () => [string, string] }>;
  activePreset?: string;
  onPresetChange?: (preset: string) => void;
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

const DEFAULT_PRESETS = [
  { key: 'this_month', labelKr: '이번달', labelJp: '今月' },
  { key: 'last_month', labelKr: '지난달', labelJp: '先月' },
  { key: 'this_quarter', labelKr: '이번분기', labelJp: '今四半期' },
  { key: 'this_year', labelKr: '올해', labelJp: '今年' },
  { key: 'all', labelKr: '전체', labelJp: '全期間' },
];

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  presets: customPresets,
  activePreset,
  onPresetChange,
}: DateRangePickerProps) {
  const { t } = useApp();

  const applyPreset = (key: string, getRange?: () => [string, string]) => {
    if (getRange) {
      const [s, e] = getRange();
      onStartDateChange(s);
      onEndDateChange(e);
    } else {
      const { start, end } = getPresetDates(key);
      onStartDateChange(start);
      onEndDateChange(end);
    }
    onPresetChange?.(key);
  };

  const isActive = (key: string, getRange?: () => [string, string]) => {
    if (activePreset !== undefined) return activePreset === key;
    if (getRange) {
      const [s, e] = getRange();
      return startDate === s && endDate === e;
    }
    const { start, end } = getPresetDates(key);
    return startDate === start && endDate === end;
  };

  return (
    <div
      className="rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap"
      style={GLASS_CARD}
    >
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
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
          onChange={(e) => onEndDateChange(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-glass-border)',
            color: 'var(--color-text-primary)',
          }}
        />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {customPresets
          ? customPresets.map((p) => {
              const active = isActive(p.label, p.getRange);
              return (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.label, p.getRange)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                      : 'var(--color-surface)',
                    color: active ? '#fff' : 'var(--color-text-secondary)',
                    border: active ? 'none' : '1px solid var(--color-glass-border)',
                  }}
                >
                  {p.label}
                </button>
              );
            })
          : DEFAULT_PRESETS.map((p) => {
              const active = isActive(p.key);
              return (
                <button
                  key={p.key}
                  onClick={() => applyPreset(p.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                      : 'var(--color-surface)',
                    color: active ? '#fff' : 'var(--color-text-secondary)',
                    border: active ? 'none' : '1px solid var(--color-glass-border)',
                  }}
                >
                  {t(p.labelKr, p.labelJp)}
                </button>
              );
            })}
      </div>
    </div>
  );
}
