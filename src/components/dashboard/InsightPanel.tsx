'use client';

import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { GLASS_CARD } from './shared';
import type { KPIData, GrowthAlertRow, PlatformSummaryRow, GenreSalesRow, CompanySalesRow, TopTitleRow, DailyTrendRow } from '@/types';

// ============================================================
// Types
// ============================================================

interface InsightPanelProps {
  kpis: KPIData;
  yoyChange: number | null;
  growthAlerts: GrowthAlertRow[];
  platformSummary: PlatformSummaryRow[];
  goalRate: number | null;
  genreSummary?: GenreSalesRow[];
  companySummary?: CompanySalesRow[];
  topTitles?: TopTitleRow[];
  dailyTrend?: DailyTrendRow[];
}

type InsightCategory = 'sales' | 'title' | 'platform' | 'genre' | 'company' | 'risk';

interface Insight {
  category: InsightCategory;
  text: string;
  highlights: Array<{ word: string; color: string }>;
  priority: number; // lower = higher priority
}

const CATEGORY_CONFIG: Record<InsightCategory, { label: [string, string]; color: string }> = {
  sales:    { label: ['매출', '売上'],       color: '#1A2B5E' },
  title:    { label: ['작품', 'タイトル'],   color: '#3B6FF6' },
  platform: { label: ['플랫폼', 'PF'],      color: '#0891b2' },
  genre:    { label: ['장르', 'ジャンル'],   color: '#7c3aed' },
  company:  { label: ['제작사', '制作会社'], color: '#059669' },
  risk:     { label: ['리스크', 'リスク'],   color: '#dc2626' },
};

// ============================================================
// Build Insights
// ============================================================

function buildInsights(
  kpis: KPIData,
  yoyChange: number | null,
  growthAlerts: GrowthAlertRow[],
  platformSummary: PlatformSummaryRow[],
  goalRate: number | null,
  genreSummary: GenreSalesRow[],
  companySummary: CompanySalesRow[],
  topTitles: TopTitleRow[],
  dailyTrend: DailyTrendRow[],
  formatCurrency: (v: number) => string,
  t: (ko: string, ja: string) => string,
): Insight[] {
  const insights: Insight[] = [];

  // ── 1. MoM 매출 변동 ──
  if (kpis.mom_change <= -20) {
    insights.push({
      category: 'sales',
      priority: 1,
      text: t(
        `선택 기간 매출이 전월 대비 ${Math.abs(kpis.mom_change).toFixed(1)}% 감소했습니다. 원인 분석이 필요합니다.`,
        `選択期間の売上が前月比${Math.abs(kpis.mom_change).toFixed(1)}%減少しました。原因分析が必要です。`,
      ),
      highlights: [{ word: `${Math.abs(kpis.mom_change).toFixed(1)}%`, color: '#dc2626' }],
    });
  } else if (kpis.mom_change <= -5) {
    insights.push({
      category: 'sales',
      priority: 3,
      text: t(
        `매출이 전월 대비 ${Math.abs(kpis.mom_change).toFixed(1)}% 소폭 감소했습니다.`,
        `売上が前月比${Math.abs(kpis.mom_change).toFixed(1)}%微減しました。`,
      ),
      highlights: [{ word: `${Math.abs(kpis.mom_change).toFixed(1)}%`, color: '#f59e0b' }],
    });
  } else if (kpis.mom_change >= 20) {
    insights.push({
      category: 'sales',
      priority: 2,
      text: t(
        `매출이 전월 대비 ${kpis.mom_change.toFixed(1)}% 대폭 성장했습니다.`,
        `売上が前月比${kpis.mom_change.toFixed(1)}%大幅に成長しました。`,
      ),
      highlights: [{ word: `${kpis.mom_change.toFixed(1)}%`, color: '#059669' }],
    });
  } else if (kpis.mom_change >= 5) {
    insights.push({
      category: 'sales',
      priority: 4,
      text: t(
        `매출이 전월 대비 ${kpis.mom_change.toFixed(1)}% 성장 중입니다.`,
        `売上が前月比${kpis.mom_change.toFixed(1)}%成長中です。`,
      ),
      highlights: [{ word: `${kpis.mom_change.toFixed(1)}%`, color: '#059669' }],
    });
  }

  // ── 2. 플랫폼 집중도 리스크 ──
  if (platformSummary.length >= 2) {
    const totalPfSales = platformSummary.reduce((s, p) => s + p.total_sales, 0);
    const topPf = platformSummary[0];
    if (totalPfSales > 0 && topPf) {
      const topShare = (topPf.total_sales / totalPfSales) * 100;
      if (topShare >= 60) {
        insights.push({
          category: 'risk',
          priority: 2,
          text: t(
            `${topPf.channel} 매출 비중이 ${topShare.toFixed(0)}%로 편중되어 있습니다. 플랫폼 다각화를 검토하세요.`,
            `${topPf.channel}の売上比率が${topShare.toFixed(0)}%と偏重しています。プラットフォーム分散を検討してください。`,
          ),
          highlights: [
            { word: topPf.channel, color: '#0891b2' },
            { word: `${topShare.toFixed(0)}%`, color: '#dc2626' },
          ],
        });
      } else if (topShare >= 45) {
        insights.push({
          category: 'platform',
          priority: 5,
          text: t(
            `${topPf.channel}이 전체 매출의 ${topShare.toFixed(0)}%를 차지하고 있습니다.`,
            `${topPf.channel}が全体売上の${topShare.toFixed(0)}%を占めています。`,
          ),
          highlights: [
            { word: topPf.channel, color: '#0891b2' },
            { word: `${topShare.toFixed(0)}%`, color: '#1A2B5E' },
          ],
        });
      }
    }
  }

  // ── 3. 급성장 작품 ──
  const surging = growthAlerts.filter(a => a.growth_pct >= 50).sort((a, b) => b.growth_pct - a.growth_pct);
  if (surging.length > 0) {
    const top = surging[0];
    const titleName = top.title_kr || top.title_jp;
    insights.push({
      category: 'title',
      priority: 2,
      text: t(
        `${titleName} 전월 대비 +${top.growth_pct.toFixed(0)}% 급성장 (매출 ${formatCurrency(top.this_month)})`,
        `${top.title_jp} 前月比+${top.growth_pct.toFixed(0)}%急成長 (売上${formatCurrency(top.this_month)})`,
      ),
      highlights: [
        { word: titleName, color: '#059669' },
        { word: `+${top.growth_pct.toFixed(0)}%`, color: '#059669' },
      ],
    });
    if (surging.length >= 3) {
      insights.push({
        category: 'title',
        priority: 6,
        text: t(
          `외 ${surging.length - 1}개 작품이 50% 이상 성장 중입니다.`,
          `他${surging.length - 1}タイトルが50%以上成長中です。`,
        ),
        highlights: [{ word: `${surging.length - 1}`, color: '#059669' }],
      });
    }
  }

  // ── 4. 급감 작품 ──
  const declining = growthAlerts.filter(a => a.growth_pct <= -30).sort((a, b) => a.growth_pct - b.growth_pct);
  if (declining.length > 0) {
    const worst = declining[0];
    const titleName = worst.title_kr || worst.title_jp;
    insights.push({
      category: 'risk',
      priority: 1,
      text: t(
        `${titleName} 전월 대비 ${worst.growth_pct.toFixed(0)}% 급감. 긴급 확인이 필요합니다.`,
        `${worst.title_jp} 前月比${worst.growth_pct.toFixed(0)}%急減。緊急確認が必要です。`,
      ),
      highlights: [
        { word: titleName, color: '#dc2626' },
        { word: `${worst.growth_pct.toFixed(0)}%`, color: '#dc2626' },
      ],
    });
  }

  // ── 5. 상위 작품 매출 집중도 ──
  if (topTitles.length >= 5 && kpis.total_sales > 0) {
    const top3Sales = topTitles.slice(0, 3).reduce((s, t) => s + t.total_sales, 0);
    const top3Share = (top3Sales / kpis.total_sales) * 100;
    if (top3Share >= 50) {
      insights.push({
        category: 'risk',
        priority: 3,
        text: t(
          `상위 3개 작품이 전체 매출의 ${top3Share.toFixed(0)}%를 차지합니다. 매출 기반 확대가 필요합니다.`,
          `上位3タイトルが全体売上の${top3Share.toFixed(0)}%を占めています。売上基盤の拡大が必要です。`,
        ),
        highlights: [{ word: `${top3Share.toFixed(0)}%`, color: '#f59e0b' }],
      });
    }
  }

  // ── 6. 제작사 편중 ──
  if (companySummary.length >= 2) {
    const totalCompSales = companySummary.reduce((s, c) => s + c.total_sales, 0);
    const topComp = companySummary[0];
    if (totalCompSales > 0 && topComp) {
      const compShare = (topComp.total_sales / totalCompSales) * 100;
      if (compShare >= 50) {
        insights.push({
          category: 'company',
          priority: 4,
          text: t(
            `${topComp.company_name}이(가) 전체 매출의 ${compShare.toFixed(0)}%를 차지하고 있습니다.`,
            `${topComp.company_name}が全体売上の${compShare.toFixed(0)}%を占めています。`,
          ),
          highlights: [
            { word: topComp.company_name, color: '#059669' },
            { word: `${compShare.toFixed(0)}%`, color: '#1A2B5E' },
          ],
        });
      }
    }
  }

  // ── 7. 장르 트렌드 ──
  if (genreSummary.length >= 2) {
    const topGenre = genreSummary[0];
    if (topGenre) {
      insights.push({
        category: 'genre',
        priority: 5,
        text: t(
          `${topGenre.genre_kr || topGenre.genre_code} 장르가 매출 1위 (${formatCurrency(topGenre.total_sales)}, ${topGenre.title_count}개 작품)`,
          `${topGenre.genre_kr || topGenre.genre_code}ジャンルが売上1位 (${formatCurrency(topGenre.total_sales)}、${topGenre.title_count}タイトル)`,
        ),
        highlights: [
          { word: topGenre.genre_kr || topGenre.genre_code, color: '#7c3aed' },
        ],
      });
    }
  }

  // ── 8. 매출 가속/감속 감지 (최근 일별 추이 기반) ──
  if (dailyTrend.length >= 14) {
    const recent7 = dailyTrend.slice(-7);
    const prev7 = dailyTrend.slice(-14, -7);
    const recentAvg = recent7.reduce((s, d) => s + d.total_sales, 0) / 7;
    const prevAvg = prev7.reduce((s, d) => s + d.total_sales, 0) / 7;
    if (prevAvg > 0) {
      const accel = ((recentAvg - prevAvg) / prevAvg) * 100;
      if (accel >= 30) {
        insights.push({
          category: 'sales',
          priority: 2,
          text: t(
            `최근 7일 일평균 매출이 직전 7일 대비 ${accel.toFixed(0)}% 가속 중입니다.`,
            `直近7日の日平均売上が前7日比${accel.toFixed(0)}%加速中です。`,
          ),
          highlights: [{ word: `${accel.toFixed(0)}%`, color: '#059669' }],
        });
      } else if (accel <= -30) {
        insights.push({
          category: 'sales',
          priority: 1,
          text: t(
            `최근 7일 일평균 매출이 직전 7일 대비 ${Math.abs(accel).toFixed(0)}% 감속 중입니다. 주의가 필요합니다.`,
            `直近7日の日平均売上が前7日比${Math.abs(accel).toFixed(0)}%減速中です。注意が必要です。`,
          ),
          highlights: [{ word: `${Math.abs(accel).toFixed(0)}%`, color: '#dc2626' }],
        });
      }
    }
  }

  // ── 9. 목표 달성률 ──
  if (goalRate !== null && goalRate > 0) {
    if (goalRate >= 100) {
      insights.push({
        category: 'sales',
        priority: 3,
        text: t(
          `매출 목표를 달성했습니다 (달성률 ${goalRate.toFixed(1)}%).`,
          `売上目標を達成しました（達成率${goalRate.toFixed(1)}%）。`,
        ),
        highlights: [{ word: `${goalRate.toFixed(1)}%`, color: '#059669' }],
      });
    } else if (goalRate < 50) {
      insights.push({
        category: 'sales',
        priority: 3,
        text: t(
          `목표 달성률이 ${goalRate.toFixed(1)}%입니다. 매출 가속 전략이 필요합니다.`,
          `目標達成率が${goalRate.toFixed(1)}%です。売上加速戦略が必要です。`,
        ),
        highlights: [{ word: `${goalRate.toFixed(1)}%`, color: '#f59e0b' }],
      });
    }
  }

  // ── 10. YoY ──
  if (yoyChange !== null) {
    if (yoyChange <= -15) {
      insights.push({
        category: 'sales',
        priority: 2,
        text: t(
          `전년 동기 대비 ${Math.abs(yoyChange).toFixed(1)}% 하락. 구조적 점검이 필요합니다.`,
          `前年同期比${Math.abs(yoyChange).toFixed(1)}%下落。構造的な確認が必要です。`,
        ),
        highlights: [{ word: `${Math.abs(yoyChange).toFixed(1)}%`, color: '#dc2626' }],
      });
    } else if (yoyChange >= 15) {
      insights.push({
        category: 'sales',
        priority: 4,
        text: t(
          `전년 동기 대비 ${yoyChange.toFixed(1)}% 성장. 연간 성장세가 양호합니다.`,
          `前年同期比${yoyChange.toFixed(1)}%成長。年間成長率は良好です。`,
        ),
        highlights: [{ word: `${yoyChange.toFixed(1)}%`, color: '#059669' }],
      });
    }
  }

  // 우선순위 정렬 후 상위 8개
  return insights.sort((a, b) => a.priority - b.priority).slice(0, 8);
}

// ============================================================
// Highlight Renderer
// ============================================================

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

// ============================================================
// Component
// ============================================================

export default function InsightPanel({
  kpis, yoyChange, growthAlerts, platformSummary, goalRate,
  genreSummary = [], companySummary = [], topTitles = [], dailyTrend = [],
}: InsightPanelProps) {
  const { formatCurrency, t } = useApp();

  const insights = buildInsights(
    kpis, yoyChange, growthAlerts, platformSummary, goalRate,
    genreSummary, companySummary, topTitles, dailyTrend,
    formatCurrency, t,
  );

  if (insights.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="rounded-2xl p-5"
      style={{
        ...GLASS_CARD,
        borderLeft: '4px solid #1A2B5E',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold"
          style={{ background: '#1A2B5E', color: '#fff' }}
        >
          AI
        </div>
        <h3 className="text-[16px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {t('AI 인사이트', 'AIインサイト')}
        </h3>
        <span className="text-[12px] ml-auto" style={{ color: 'var(--color-text-muted)' }}>
          {insights.length}{t('개 분석', '件の分析')}
        </span>
      </div>

      {/* Insights List */}
      <div className="space-y-3">
        {insights.map((insight, i) => {
          const catConfig = CATEGORY_CONFIG[insight.category];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              className="flex items-start gap-3"
            >
              {/* Category Tag */}
              <span
                className="shrink-0 mt-0.5 px-2 py-0.5 rounded text-[11px] font-semibold"
                style={{
                  background: `${catConfig.color}14`,
                  color: catConfig.color,
                  border: `1px solid ${catConfig.color}25`,
                }}
              >
                {t(catConfig.label[0], catConfig.label[1])}
              </span>

              {/* Text */}
              <span
                className="text-[14px] leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {highlightText(insight.text, insight.highlights)}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
