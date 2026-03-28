'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { GLASS_CARD, cardVariants } from './shared';

interface SalesGoalProps {
  currentSales: number;
  goal: number;
  onGoalChange: (v: number) => void;
}

export default function SalesGoal({ currentSales, goal, onGoalChange }: SalesGoalProps) {
  const { formatCurrency, t } = useApp();
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(goal));

  const rate = goal > 0 ? Math.min((currentSales / goal) * 100, 100) : 0;
  const overRate = goal > 0 ? (currentSales / goal) * 100 : 0;

  const handleSave = () => {
    const v = parseInt(inputVal, 10);
    if (!isNaN(v) && v > 0) {
      onGoalChange(v);
    }
    setEditing(false);
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="show"
      className="rounded-2xl p-6"
      style={GLASS_CARD}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={18} style={{ color: '#818cf8' }} />
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('매출 목표 달성률', '売上目標達成率')}
          </h2>
        </div>
        <button
          onClick={() => { setInputVal(String(goal)); setEditing(!editing); }}
          className="text-xs px-2 py-1 rounded-lg transition-colors"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-glass-border)',
          }}
        >
          {editing ? t('취소', 'キャンセル') : t('목표 설정', '目標設定')}
        </button>
      </div>

      {editing && (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="number"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={t('목표 금액 (JPY)', '目標金額 (JPY)')}
            className="flex-1 rounded-lg px-3 py-2 text-sm"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-glass-border)',
              color: 'var(--color-text-primary)',
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
          >
            {t('저장', '保存')}
          </button>
        </div>
      )}

      {goal > 0 ? (
        <>
          <div className="flex justify-between items-end mb-2">
            <p className="text-3xl font-bold" style={{
              color: overRate >= 100 ? '#22c55e' : overRate >= 70 ? '#818cf8' : '#f59e0b',
            }}>
              {overRate.toFixed(1)}%
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {formatCurrency(currentSales)} / {formatCurrency(goal)}
            </p>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-glass-border)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: overRate >= 100
                  ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                  : overRate >= 70
                    ? 'linear-gradient(90deg, #818cf8, #a78bfa)'
                    : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${rate}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
          {t('목표를 설정하면 달성률이 표시됩니다.', '目標を設定すると達成率が表示されます。')}
        </p>
      )}
    </motion.div>
  );
}
