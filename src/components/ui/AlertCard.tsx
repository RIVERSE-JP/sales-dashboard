'use client';
import { motion } from 'framer-motion';
import { alertSlideIn } from '@/lib/animations';
import { useApp } from '@/context/AppContext';
import { TrendingUp, TrendingDown } from 'lucide-react';

// 플랫폼 브랜드 색상 매핑
const platformColors: Record<string, string> = {
  piccoma: '#E8372E',
  lineマンガ: '#06C755',
  'line manga': '#06C755',
  lineマンガインディーズ: '#06C755',
  cmoa: '#0068B7',
  'renta!': '#ED6103',
  renta: '#ED6103',
  kindle: '#FF9900',
  めちゃコミック: '#FF4081',
  mechacomic: '#FF4081',
  booklive: '#2196F3',
  default: '#1A2B5E',
};

function getPlatformColor(platform: string): string {
  const key = platform.toLowerCase();
  for (const [k, v] of Object.entries(platformColors)) {
    if (key.includes(k)) return v;
  }
  return platformColors.default;
}

interface AlertCardProps {
  platform: string;
  title: string;
  changePercent: number;
  prevSales: number;
  currentSales: number;
  onClick?: () => void;
}

export default function AlertCard({
  platform,
  title,
  changePercent,
  prevSales,
  currentSales,
  onClick,
}: AlertCardProps) {
  const { formatCurrency } = useApp();
  const isIncrease = changePercent >= 0;
  const color = getPlatformColor(platform);

  const statusBg = isIncrease
    ? 'var(--color-status-good-bg)'
    : 'var(--color-status-danger-bg)';
  const statusBorder = isIncrease
    ? 'var(--color-status-good-border)'
    : 'var(--color-status-danger-border)';
  const statusText = isIncrease
    ? 'var(--color-status-good)'
    : 'var(--color-status-danger)';

  return (
    <motion.div
      variants={alertSlideIn}
      whileHover={{ scale: 1.02, boxShadow: `0 8px 32px ${color}20` }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      style={{
        background: statusBg,
        border: `1px solid ${statusBorder}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 12,
        padding: '14px 16px',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      {/* Platform badge */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 14,
          color,
          flexShrink: 0,
          letterSpacing: '-0.02em',
        }}
      >
        {platform.slice(0, 2).toUpperCase()}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-text-muted)',
            display: 'flex',
            gap: 6,
            alignItems: 'center',
          }}
        >
          <span>{formatCurrency(prevSales)}</span>
          <span style={{ color: 'var(--color-text-subtle)' }}>→</span>
          <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            {formatCurrency(currentSales)}
          </span>
        </div>
      </div>

      {/* Change pill */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          padding: '4px 10px',
          borderRadius: 9999,
          fontSize: 13,
          fontWeight: 700,
          color: statusText,
          background: statusBg,
          border: `1px solid ${statusBorder}`,
          flexShrink: 0,
        }}
      >
        {isIncrease ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        {isIncrease ? '+' : ''}
        {changePercent.toFixed(1)}%
      </div>
    </motion.div>
  );
}
