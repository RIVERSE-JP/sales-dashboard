'use client';

import { useApp } from '@/context/AppContext';
import { motion } from 'framer-motion';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

type PresetKey = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'all' | 'last7' | 'last30' | 'last90';

function getPresetDates(key: PresetKey): [string, string] {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  switch (key) {
    case 'thisMonth':
      return [fmt(new Date(now.getFullYear(), now.getMonth(), 1)), fmt(now)];
    case 'lastMonth': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return [fmt(s), fmt(e)];
    }
    case 'thisQuarter': {
      const q = Math.floor(now.getMonth() / 3) * 3;
      return [fmt(new Date(now.getFullYear(), q, 1)), fmt(now)];
    }
    case 'thisYear':
      return [fmt(new Date(now.getFullYear(), 0, 1)), fmt(now)];
    case 'all':
      return ['2020-01-01', fmt(now)];
    case 'last7': {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return [fmt(d), fmt(now)];
    }
    case 'last30': {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return [fmt(d), fmt(now)];
    }
    case 'last90': {
      const d = new Date(now);
      d.setDate(d.getDate() - 89);
      return [fmt(d), fmt(now)];
    }
  }
}

export default function DateRangePicker({ startDate, endDate, onStartDateChange, onEndDateChange }: DateRangePickerProps) {
  const { t } = useApp();

  const presets: { key: PresetKey; label: string }[] = [
    { key: 'thisMonth', label: t('이번달', '今月') },
    { key: 'lastMonth', label: t('지난달', '先月') },
    { key: 'thisQuarter', label: t('이번분기', '今四半期') },
    { key: 'thisYear', label: t('올해', '今年') },
    { key: 'all', label: t('전체', '全期間') },
    { key: 'last7', label: t('최근 7일', '直近7日') },
    { key: 'last30', label: t('최근 30일', '直近30日') },
    { key: 'last90', label: t('최근 90일', '直近90日') },
  ];

  const handlePreset = (key: PresetKey) => {
    const [s, e] = getPresetDates(key);
    onStartDateChange(s);
    onEndDateChange(e);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="glass-card p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-[var(--color-text-secondary)]">
          {t('기간', '期間')}
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]"
        />
        <span className="text-[var(--color-text-muted)]">~</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)]"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {presets.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handlePreset(key)}
            className="px-3 py-1 text-xs rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] hover:border-[var(--color-glass-hover-border)] transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
