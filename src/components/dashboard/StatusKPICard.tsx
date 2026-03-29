'use client';

import { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { GLASS_CARD } from './shared';

interface StatusKPICardProps {
  label: string;
  value: number;
  formatter: (v: number) => string;
  status: 'good' | 'warn' | 'bad' | 'neutral';
  changePct?: number | null;
  changeLabel?: string;
  subText?: string;
  /** 0–100 gauge (optional, e.g. goal achievement) */
  gauge?: number | null;
  gaugeLabel?: string;
  delay?: number;
  icon?: React.ReactNode;
}

const STATUS_COLORS: Record<string, string> = {
  good: '#22c55e',
  warn: '#f59e0b',
  bad: '#ef4444',
  neutral: '#6366f1',
};

function AnimatedValue({ value, formatter }: { value: number; formatter: (v: number) => string }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 45, damping: 18, duration: 1500 });
  const display = useTransform(spring, (v: number) => formatter(v));
  useEffect(() => { mv.set(value); }, [value, mv]);
  return <motion.span>{display}</motion.span>;
}

export default function StatusKPICard({
  label,
  value,
  formatter,
  status,
  changePct,
  changeLabel,
  subText,
  gauge,
  gaugeLabel,
  delay = 0,
  icon,
}: StatusKPICardProps) {
  const borderColor = STATUS_COLORS[status] ?? STATUS_COLORS.neutral;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, type: 'spring', stiffness: 120, damping: 20 }}
      whileHover={{ y: -3, boxShadow: `0 12px 40px rgba(0,0,0,0.18), 0 0 0 1px ${borderColor}33` }}
      className="rounded-2xl p-5 cursor-default relative overflow-hidden"
      style={{
        ...GLASS_CARD,
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      {/* Subtle glow bg */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.06]"
        style={{
          background: `radial-gradient(circle, ${borderColor}, transparent)`,
          transform: 'translate(30%, -30%)',
        }}
      />

      <div className="relative z-10">
        {/* Label row */}
        <div className="flex items-center gap-2 mb-3">
          {icon && <span style={{ color: borderColor }}>{icon}</span>}
          <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {label}
          </p>
        </div>

        {/* Main value */}
        <p className="text-[32px] font-bold leading-tight mb-1" style={{ color: 'var(--color-text-primary)' }}>
          <AnimatedValue value={value} formatter={formatter} />
        </p>

        {/* Change pill */}
        {changePct != null && (
          <div className="flex items-center gap-2 mt-2">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[13px] font-semibold"
              style={{
                background: changePct >= 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                color: changePct >= 0 ? '#22c55e' : '#ef4444',
              }}
            >
              {changePct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {changePct > 0 ? '+' : ''}{changePct.toFixed(1)}%
            </span>
            {changeLabel && (
              <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{changeLabel}</span>
            )}
          </div>
        )}

        {/* Sub text */}
        {subText && (
          <p className="text-[12px] mt-2" style={{ color: 'var(--color-text-muted)' }}>{subText}</p>
        )}

        {/* Gauge bar */}
        {gauge != null && (
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1.5">
              {gaugeLabel && (
                <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{gaugeLabel}</span>
              )}
              <span className="text-[13px] font-bold" style={{ color: borderColor }}>
                {gauge.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-glass-border)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${borderColor}cc, ${borderColor})`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(gauge, 100)}%` }}
                transition={{ duration: 1.2, delay: delay + 0.3, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
