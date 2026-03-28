'use client';

import { useApp } from '@/context/AppContext';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (d: string) => void;
  onEndDateChange: (d: string) => void;
}

const GLASS_INPUT = {
  background: 'var(--color-input-bg)',
  border: '1px solid var(--color-glass-border)',
  borderRadius: '8px',
  color: 'var(--color-text-primary)',
  padding: '6px 10px',
  fontSize: '13px',
} as const;

export default function DateRangePicker({ startDate, endDate, onStartDateChange, onEndDateChange }: DateRangePickerProps) {
  const { t } = useApp();

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');

  const presets = [
    {
      label: t('이번달', '今月'),
      start: `${yyyy}-${mm}-01`,
      end: '',
    },
    {
      label: t('지난달', '先月'),
      start: (() => {
        const d = new Date(yyyy, now.getMonth() - 1, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      })(),
      end: (() => {
        const d = new Date(yyyy, now.getMonth(), 0);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })(),
    },
    {
      label: t('이번분기', '今四半期'),
      start: `${yyyy}-${String(Math.floor(now.getMonth() / 3) * 3 + 1).padStart(2, '0')}-01`,
      end: '',
    },
    {
      label: t('올해', '今年'),
      start: `${yyyy}-01-01`,
      end: '',
    },
    {
      label: t('전체', '全体'),
      start: '',
      end: '',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        style={GLASS_INPUT}
        className="outline-none"
      />
      <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>~</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        style={GLASS_INPUT}
        className="outline-none"
      />
      <div className="flex flex-wrap gap-1.5 ml-2">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              onStartDateChange(p.start);
              onEndDateChange(p.end);
            }}
            className="text-xs px-2.5 py-1 rounded-md cursor-pointer transition-all hover:brightness-125"
            style={{
              background: 'var(--color-input-bg)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-glass-border)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
