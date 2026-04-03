'use client';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('API Error');
  return r.json();
});

const SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,      // 네트워크 복구 시 재시도
  dedupingInterval: 60000,
  keepPreviousData: true,
  errorRetryCount: 3,               // 에러 시 3회 재시도
  errorRetryInterval: 2000,         // 2초 간격
};

// ============================================================
// Dashboard
// ============================================================

export function useDashboardKPIs() {
  return useSWR('/api/dashboard/kpis', fetcher, SWR_CONFIG);
}

export function useMonthlyTrend() {
  return useSWR('/api/dashboard/monthly-trend', fetcher, SWR_CONFIG);
}

export function usePlatformSummary() {
  return useSWR('/api/dashboard/platform-summary', fetcher, SWR_CONFIG);
}

export function useTopTitles(limit = 20, month?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (month) params.set('month', month);
  return useSWR(`/api/dashboard/top-titles?${params}`, fetcher, SWR_CONFIG);
}

export function useGrowthAlerts() {
  return useSWR('/api/dashboard/growth-alerts', fetcher, SWR_CONFIG);
}

export function usePlatformDetail(channel: string | null, start?: string, end?: string) {
  const params = channel ? new URLSearchParams({ channel }) : null;
  if (params && start) params.set('start', start);
  if (params && end) params.set('end', end);
  return useSWR(
    params ? `/api/dashboard/platform-detail?${params}` : null,
    fetcher,
    SWR_CONFIG
  );
}

export function useTitleDetail(titleJp: string | null) {
  return useSWR(
    titleJp ? `/api/dashboard/title-detail?title_jp=${encodeURIComponent(titleJp)}` : null,
    fetcher,
    SWR_CONFIG
  );
}

// ============================================================
// Analysis
// ============================================================

export function useGenreSummary(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const key = params.toString() ? `/api/analysis/genre-summary?${params}` : '/api/analysis/genre-summary';
  return useSWR(key, fetcher, SWR_CONFIG);
}

export function useCompanySummary(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const key = params.toString() ? `/api/analysis/company-summary?${params}` : '/api/analysis/company-summary';
  return useSWR(key, fetcher, SWR_CONFIG);
}

export function useFormatSummary(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const key = params.toString() ? `/api/analysis/format-summary?${params}` : '/api/analysis/format-summary';
  return useSWR(key, fetcher, SWR_CONFIG);
}

export function useDailyTrend(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  return useSWR(`/api/analysis/daily-trend?${params}`, fetcher, SWR_CONFIG);
}

export function useWeeklyTrend(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  return useSWR(`/api/analysis/weekly-trend?${params}`, fetcher, SWR_CONFIG);
}

export function usePlatformSummaryForPeriod(startDate: string, endDate: string) {
  const key = startDate && endDate
    ? `/api/analysis/platform-summary-period?startDate=${startDate}&endDate=${endDate}`
    : null;
  return useSWR(key, fetcher, SWR_CONFIG);
}

export function usePeriodKpis(startDate: string, endDate: string) {
  const key = startDate && endDate
    ? `/api/analysis/period-kpis?startDate=${startDate}&endDate=${endDate}`
    : null;
  return useSWR(key, fetcher, SWR_CONFIG);
}

export function useTitleRankings(currentStart: string, currentEnd: string, prevStart: string, prevEnd: string) {
  const key = currentStart && currentEnd
    ? `/api/analysis/title-rankings?currentStart=${currentStart}&currentEnd=${currentEnd}&prevStart=${prevStart}&prevEnd=${prevEnd}&limit=200`
    : null;
  return useSWR(key, fetcher, SWR_CONFIG);
}

// ============================================================
// Sales / Titles
// ============================================================

export function useTitleSummaries(start?: string, end?: string) {
  const params = start && end ? `?start=${start}&end=${end}` : '';
  return useSWR(`/api/sales/title-summaries${params}`, fetcher, SWR_CONFIG);
}

export function useTitleMaster() {
  return useSWR('/api/sales/title-master', fetcher, SWR_CONFIG);
}

export function useGenres() {
  return useSWR('/api/sales/genres', fetcher, { ...SWR_CONFIG, dedupingInterval: 300000 });
}

export function usePlatforms() {
  return useSWR('/api/sales/platforms', fetcher, { ...SWR_CONFIG, dedupingInterval: 300000 });
}
