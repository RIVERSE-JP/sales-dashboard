'use client';

import { useApp } from '@/context/AppContext';
import { motion } from 'framer-motion';

interface GranularityToggleProps {
  value: 'daily' | 'weekly' | 'monthly';
  onChange: (value: 'daily' | 'weekly' | 'monthly') => void;
}

const options: Array<{ key: 'daily' | 'weekly' | 'monthly'; ko: string; ja: string }> = [
  { key: 'daily', ko: '일별', ja: '日別' },
  { key: 'weekly', ko: '주별', ja: '週別' },
  { key: 'monthly', ko: '월별', ja: '月別' },
];

export default function GranularityToggle({ value, onChange }: GranularityToggleProps) {
  const { t } = useApp();

  return (
    <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-glass)] p-0.5">
      {options.map(({ key, ko, ja }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className="relative px-3 py-1 text-xs font-medium rounded-md transition-colors"
        >
          {value === key && (
            <motion.div
              layoutId="granularity-active"
              className="absolute inset-0 rounded-md bg-[var(--color-accent-blue)]"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className={`relative z-10 ${value === key ? 'text-white' : 'text-[var(--color-text-secondary)]'}`}>
            {t(ko, ja)}
          </span>
        </button>
      ))}
    </div>
  );
}
