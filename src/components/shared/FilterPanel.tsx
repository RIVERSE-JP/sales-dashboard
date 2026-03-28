'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterPanelProps {
  filters: Array<{
    key: string;
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
  }>;
  onReset: () => void;
}

export default function FilterPanel({ filters, onReset }: FilterPanelProps) {
  const { t } = useApp();
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-blue)] transition-colors"
        >
          <motion.span
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="inline-block"
          >
            ▶
          </motion.span>
          {t('필터', 'フィルター')}
        </button>
        <button
          onClick={onReset}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent-red)] transition-colors"
        >
          {t('필터 초기화', 'リセット')}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-3">
              {filters.map((filter) => (
                <div key={filter.key} className="flex flex-col gap-1 min-w-[140px]">
                  <label className="text-xs text-[var(--color-text-muted)]">
                    {filter.label}
                  </label>
                  <select
                    value={filter.value}
                    onChange={(e) => filter.onChange(e.target.value)}
                    className="rounded-lg px-3 py-1.5 text-sm bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)] transition-colors"
                  >
                    {filter.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
