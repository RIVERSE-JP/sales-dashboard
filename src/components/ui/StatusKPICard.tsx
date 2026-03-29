'use client';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { staggerItem, gaugeFill, numberSpring } from '@/lib/animations';

interface StatusKPICardProps {
  label: string;
  value: number;
  prevValue?: number;
  yoyValue?: number;
  goalValue?: number;
  format?: 'currency' | 'number' | 'percent';
  accentColor?: string;
  onClick?: () => void;
}

type Status = 'good' | 'warning' | 'danger' | 'neutral';

function getStatus(value: number, prevValue?: number): Status {
  if (prevValue === undefined || prevValue === 0) return 'neutral';
  const change = ((value - prevValue) / prevValue) * 100;
  if (change >= 0) return 'good';
  if (change >= -10) return 'warning';
  return 'danger';
}

function getChangePercent(value: number, prevValue?: number): number | null {
  if (prevValue === undefined || prevValue === 0) return null;
  return ((value - prevValue) / prevValue) * 100;
}

const statusColors: Record<Status, { border: string; bg: string; text: string }> = {
  good: {
    border: 'var(--color-status-good)',
    bg: 'var(--color-status-good-bg)',
    text: 'var(--color-status-good)',
  },
  warning: {
    border: 'var(--color-status-warning)',
    bg: 'var(--color-status-warning-bg)',
    text: 'var(--color-status-warning)',
  },
  danger: {
    border: 'var(--color-status-danger)',
    bg: 'var(--color-status-danger-bg)',
    text: 'var(--color-status-danger)',
  },
  neutral: {
    border: 'var(--color-border)',
    bg: 'transparent',
    text: 'var(--color-text-secondary)',
  },
};

function AnimatedNumber({
  value,
  format,
  formatCurrency,
}: {
  value: number;
  format: StatusKPICardProps['format'];
  formatCurrency: (n: number) => string;
}) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, numberSpring);
  const display = useTransform(spring, (v) => {
    const rounded = Math.round(v);
    if (format === 'currency') return formatCurrency(rounded);
    if (format === 'percent') return `${rounded.toFixed(1)}%`;
    return rounded.toLocaleString();
  });

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span>{display}</motion.span>;
}

export default function StatusKPICard({
  label,
  value,
  prevValue,
  yoyValue,
  goalValue,
  format = 'currency',
  accentColor,
  onClick,
}: StatusKPICardProps) {
  const { formatCurrency } = useApp();
  const status = getStatus(value, prevValue);
  const changePercent = getChangePercent(value, prevValue);
  const yoyChangePercent = getChangePercent(value, yoyValue);
  const colors = statusColors[status];
  const goalPercent = goalValue ? Math.min((value / goalValue) * 100, 100) : null;

  const borderColor = accentColor || colors.border;

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -3, boxShadow: 'var(--glass-card-hover-shadow)' }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      style={{
        background: 'var(--glass-card-premium)',
        border: '1px solid var(--glass-card-premium-border)',
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 14,
        padding: '20px 20px 16px',
        boxShadow: 'var(--glass-card-premium-shadow)',
        backdropFilter: 'blur(12px)',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle status tint */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: colors.bg,
          pointerEvents: 'none',
          borderRadius: 14,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Label */}
        <div
          style={{
            fontSize: 'var(--kpi-label-size)',
            color: 'var(--color-text-secondary)',
            fontWeight: 500,
            marginBottom: 8,
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </div>

        {/* Value row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
          <div
            style={{
              fontSize: 'var(--kpi-number-size)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.1,
            }}
          >
            <AnimatedNumber value={value} format={format} formatCurrency={formatCurrency} />
          </div>

          {/* Change pill */}
          {changePercent !== null && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: '2px 8px',
                borderRadius: 9999,
                fontSize: 'var(--kpi-change-size)',
                fontWeight: 600,
                background: colors.bg,
                color: colors.text,
                border: `1px solid ${status === 'neutral' ? 'transparent' : colors.border}`,
              }}
            >
              {changePercent > 0 ? (
                <TrendingUp size={13} />
              ) : changePercent < 0 ? (
                <TrendingDown size={13} />
              ) : (
                <Minus size={13} />
              )}
              {changePercent > 0 ? '+' : ''}
              {changePercent.toFixed(1)}%
            </div>
          )}
        </div>

        {/* YoY row */}
        {yoyChangePercent !== null && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-text-muted)',
              marginBottom: 8,
            }}
          >
            전년 동기 대비{' '}
            <span style={{ color: yoyChangePercent >= 0 ? 'var(--color-status-good)' : 'var(--color-status-danger)', fontWeight: 600 }}>
              {yoyChangePercent > 0 ? '+' : ''}
              {yoyChangePercent.toFixed(1)}%
            </span>
          </div>
        )}

        {/* Goal gauge */}
        {goalPercent !== null && goalValue && (
          <div style={{ marginTop: 4 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: 'var(--color-text-muted)',
                marginBottom: 4,
              }}
            >
              <span>목표 달성률</span>
              <span style={{ fontWeight: 600 }}>{goalPercent.toFixed(0)}%</span>
            </div>
            <div
              style={{
                height: 4,
                borderRadius: 4,
                background: 'var(--color-glass-border)',
                overflow: 'hidden',
              }}
            >
              <motion.div
                variants={gaugeFill}
                custom={goalPercent}
                initial="initial"
                animate="animate"
                style={{
                  height: '100%',
                  borderRadius: 4,
                  background:
                    goalPercent >= 100
                      ? 'var(--color-status-good)'
                      : goalPercent >= 70
                        ? 'var(--color-accent-blue)'
                        : 'var(--color-status-warning)',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
