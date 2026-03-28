'use client';

import { motion } from 'framer-motion';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  accentColor?: string;
}

export default function MetricCard({ title, value, change, changeLabel, icon, onClick, accentColor }: MetricCardProps) {
  const isClickable = !!onClick;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={`glass-card p-5 ${accentColor ?? ''} ${isClickable ? 'cursor-pointer card-hover-lift' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
            {title}
          </p>
          <p className="text-2xl font-bold text-[var(--color-text-heading)]">
            {value}
          </p>
        </div>
        {icon && (
          <div className="text-[var(--color-text-muted)] text-xl">
            {icon}
          </div>
        )}
      </div>

      {change !== undefined && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className={change >= 0 ? 'pill-positive' : 'pill-negative'}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
          </span>
          {changeLabel && (
            <span className="text-xs text-[var(--color-text-muted)]">
              {changeLabel}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
