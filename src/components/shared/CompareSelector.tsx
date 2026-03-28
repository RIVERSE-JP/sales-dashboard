'use client';

import { useApp } from '@/context/AppContext';
import { motion } from 'framer-motion';

interface CompareSelectorProps {
  items: Array<{ id: string; label: string; color?: string }>;
  selected: string[];
  onChange: (selected: string[]) => void;
  maxSelect?: number;
}

const DEFAULT_COLORS = ['#3B6FF6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899'];

export default function CompareSelector({ items, selected, onChange, maxSelect }: CompareSelectorProps) {
  const { t } = useApp();

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else if (!maxSelect || selected.length < maxSelect) {
      onChange([...selected, id]);
    }
  };

  const getColor = (item: { id: string; color?: string }, idx: number) =>
    item.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

  return (
    <div className="glass-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
          {t('비교 항목 선택', '比較項目選択')}
        </span>
        {maxSelect && (
          <span className="text-xs text-[var(--color-text-muted)]">
            {selected.length}/{maxSelect}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => {
          const isSelected = selected.includes(item.id);
          const color = getColor(item, idx);
          const isDisabled = !isSelected && !!maxSelect && selected.length >= maxSelect;

          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => !isDisabled && toggle(item.id)}
              disabled={isDisabled}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isSelected
                  ? 'border-transparent text-white'
                  : isDisabled
                    ? 'border-[var(--color-border-subtle)] text-[var(--color-text-subtle)] opacity-50 cursor-not-allowed'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-glass-hover-border)]'
              }`}
              style={isSelected ? { backgroundColor: color } : undefined}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color, opacity: isSelected ? 1 : 0.5 }}
              />
              {item.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
