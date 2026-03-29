'use client';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { Lightbulb } from 'lucide-react';

interface InsightItem {
  text: string;
  highlights?: { word: string; color?: string }[];
}

interface InsightPanelProps {
  title?: string;
  insights: InsightItem[];
}

function renderHighlightedText(text: string, highlights?: InsightItem['highlights']) {
  if (!highlights || highlights.length === 0) return text;

  const result = text;
  const parts: (string | { text: string; color: string })[] = [];
  let remaining = result;

  for (const h of highlights) {
    const idx = remaining.indexOf(h.word);
    if (idx === -1) continue;
    if (idx > 0) parts.push(remaining.slice(0, idx));
    parts.push({ text: h.word, color: h.color || 'var(--color-accent-blue)' });
    remaining = remaining.slice(idx + h.word.length);
  }
  if (remaining) parts.push(remaining);
  if (parts.length === 0) return text;

  return parts.map((p, i) =>
    typeof p === 'string' ? (
      <span key={i}>{p}</span>
    ) : (
      <span key={i} style={{ fontWeight: 700, color: p.color }}>
        {p.text}
      </span>
    )
  );
}

export default function InsightPanel({ title = '이번 달 핵심 인사이트', insights }: InsightPanelProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      style={{
        background: 'var(--glass-card-premium)',
        border: '1px solid var(--glass-card-premium-border)',
        borderRadius: 14,
        padding: '20px 24px',
        boxShadow: 'var(--glass-card-premium-shadow)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
        }}
      >
        <Lightbulb size={18} style={{ color: 'var(--color-accent-amber)' }} />
        {title}
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {insights.map((insight, i) => (
          <motion.li
            key={i}
            variants={staggerItem}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--color-accent-blue)',
                flexShrink: 0,
                marginTop: 7,
              }}
            />
            <span>{renderHighlightedText(insight.text, insight.highlights)}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
