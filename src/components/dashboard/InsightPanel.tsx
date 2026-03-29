'use client';

import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { GLASS_CARD } from './shared';
import type { KPIData, GrowthAlertRow, PlatformSummaryRow } from '@/types';

interface InsightPanelProps {
  kpis: KPIData;
  yoyChange: number | null;
  growthAlerts: GrowthAlertRow[];
  platformSummary: PlatformSummaryRow[];
  goalRate: number | null;
}

interface Insight {
  text: string;
  highlights: Array<{ word: string; color: string }>;
}

function buildInsights(
  kpis: KPIData,
  yoyChange: number | null,
  growthAlerts: GrowthAlertRow[],
  platformSummary: PlatformSummaryRow[],
  goalRate: number | null,
  formatCurrency: (v: number) => string,
  t: (ko: string, ja: string) => string,
): Insight[] {
  const insights: Insight[] = [];

  // 1. MoM overview
  if (kpis.mom_change <= -20) {
    const topPlatform = platformSummary[0]?.channel ?? '';
    insights.push({
      text: t(
        `이달 매출 전월 대비 ${Math.abs(kpis.mom_change).toFixed(1)}% 감소. 주요 플랫폼: ${topPlatform}`,
        `今月の売上は前月比${Math.abs(kpis.mom_change).toFixed(1)}%減少。主要プラットフォーム: ${topPlatform}`,
      ),
      highlights: [
        { word: `${Math.abs(kpis.mom_change).toFixed(1)}%`, color: '#ef4444' },
        { word: topPlatform, color: '#6366f1' },
      ],
    });
  } else if (kpis.mom_change >= 10) {
    insights.push({
      text: t(
        `이달 매출 전월 대비 ${kpis.mom_change.toFixed(1)}% 성장으로 호조세 유지 중`,
        `今月の売上は前月比${kpis.mom_change.toFixed(1)}%成長で好調を維持`,
      ),
      highlights: [{ word: `${kpis.mom_change.toFixed(1)}%`, color: '#22c55e' }],
    });
  }

  // 2. YoY
  if (yoyChange !== null) {
    if (yoyChange <= -15) {
      insights.push({
        text: t(
          `전년 동기 대비 ${Math.abs(yoyChange).toFixed(1)}% 하락 — 구조적 점검 필요`,
          `前年同期比${Math.abs(yoyChange).toFixed(1)}%下落 — 構造的な確認が必要`,
        ),
        highlights: [{ word: `${Math.abs(yoyChange).toFixed(1)}%`, color: '#ef4444' }],
      });
    } else if (yoyChange >= 15) {
      insights.push({
        text: t(
          `전년 동기 대비 ${yoyChange.toFixed(1)}% 성장 — 연간 성장세 양호`,
          `前年同期比${yoyChange.toFixed(1)}%成長 — 年間成長率は良好`,
        ),
        highlights: [{ word: `${yoyChange.toFixed(1)}%`, color: '#22c55e' }],
      });
    }
  }

  // 3. Surging titles
  const surging = growthAlerts.filter(a => a.growth_pct >= 50).sort((a, b) => b.growth_pct - a.growth_pct);
  if (surging.length > 0) {
    const top = surging[0];
    insights.push({
      text: t(
        `${top.title_kr || top.title_jp} 급성장 중 (+${top.growth_pct.toFixed(0)}%), 매출 ${formatCurrency(top.this_month)}`,
        `${top.title_jp} が急成長中 (+${top.growth_pct.toFixed(0)}%)、売上${formatCurrency(top.this_month)}`,
      ),
      highlights: [
        { word: top.title_kr || top.title_jp, color: '#22c55e' },
        { word: `+${top.growth_pct.toFixed(0)}%`, color: '#22c55e' },
      ],
    });
  }

  // 4. Declining titles
  const declining = growthAlerts.filter(a => a.growth_pct <= -30).sort((a, b) => a.growth_pct - b.growth_pct);
  if (declining.length > 0) {
    const worst = declining[0];
    insights.push({
      text: t(
        `${worst.title_kr || worst.title_jp} ${worst.growth_pct.toFixed(0)}% 급감 — 긴급 확인 필요`,
        `${worst.title_jp} が${worst.growth_pct.toFixed(0)}%急減 — 緊急確認が必要`,
      ),
      highlights: [
        { word: worst.title_kr || worst.title_jp, color: '#ef4444' },
        { word: `${worst.growth_pct.toFixed(0)}%`, color: '#ef4444' },
      ],
    });
  }

  // 5. Goal rate
  if (goalRate !== null && goalRate > 0) {
    if (goalRate >= 100) {
      insights.push({
        text: t(
          `이달 매출 목표 달성! (${goalRate.toFixed(1)}%)`,
          `今月の売上目標達成！(${goalRate.toFixed(1)}%)`,
        ),
        highlights: [{ word: `${goalRate.toFixed(1)}%`, color: '#22c55e' }],
      });
    } else if (goalRate < 50) {
      insights.push({
        text: t(
          `목표 달성률 ${goalRate.toFixed(1)}% — 하반기 매출 가속 전략 필요`,
          `目標達成率${goalRate.toFixed(1)}% — 後半の売上加速戦略が必要`,
        ),
        highlights: [{ word: `${goalRate.toFixed(1)}%`, color: '#f59e0b' }],
      });
    }
  }

  return insights.slice(0, 5);
}

function highlightText(text: string, highlights: Array<{ word: string; color: string }>) {
  let result: Array<string | { text: string; color: string }> = [text];

  for (const h of highlights) {
    const next: typeof result = [];
    for (const part of result) {
      if (typeof part !== 'string') {
        next.push(part);
        continue;
      }
      const idx = part.indexOf(h.word);
      if (idx === -1) {
        next.push(part);
      } else {
        if (idx > 0) next.push(part.slice(0, idx));
        next.push({ text: h.word, color: h.color });
        if (idx + h.word.length < part.length) next.push(part.slice(idx + h.word.length));
      }
    }
    result = next;
  }

  return result.map((part, i) =>
    typeof part === 'string' ? (
      <span key={i}>{part}</span>
    ) : (
      <span key={i} className="font-bold" style={{ color: part.color }}>{part.text}</span>
    )
  );
}

export default function InsightPanel({ kpis, yoyChange, growthAlerts, platformSummary, goalRate }: InsightPanelProps) {
  const { formatCurrency, t } = useApp();

  const insights = buildInsights(kpis, yoyChange, growthAlerts, platformSummary, goalRate, formatCurrency, t);

  if (insights.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="rounded-2xl p-5"
      style={{
        ...GLASS_CARD,
        borderLeft: '3px solid #6366f1',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb size={18} style={{ color: '#fbbf24' }} />
        <h3 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {t('AI 인사이트', 'AIインサイト')}
        </h3>
      </div>
      <ul className="space-y-2.5">
        {insights.map((insight, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            className="flex items-start gap-2.5 text-[13px] leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#6366f1' }} />
            <span>{highlightText(insight.text, insight.highlights)}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
