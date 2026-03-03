/**
 * dataConsolidator.ts
 *
 * Merges new raw platform data (속보치) with existing dashboard data.
 * Replaces overlapping (channel, date range) and recalculates all summaries.
 */
import type { DailySale, TitleMaster } from '@/types';
import type { ConvertedData } from '@/utils/excelConverter';
import {
  buildMonthlySummary,
  buildTitleSummary,
  buildPlatformSummary,
  buildTitleMasterFromSales,
} from '@/utils/excelConverter';

/* ------------------------------------------------------------------ */
/*  Merge daily sales                                                  */
/* ------------------------------------------------------------------ */

/**
 * Merge new data into existing dailySales.
 * For each channel in newData, removes existing rows that fall within
 * the new data's date range for that channel, then adds the new rows.
 */
export function mergeDailySales(
  existing: DailySale[],
  newData: DailySale[],
): DailySale[] {
  if (newData.length === 0) return existing;

  // Determine date ranges per channel in new data
  const channelRanges = new Map<string, { min: string; max: string }>();
  for (const r of newData) {
    const range = channelRanges.get(r.channel);
    if (range) {
      if (r.date < range.min) range.min = r.date;
      if (r.date > range.max) range.max = r.date;
    } else {
      channelRanges.set(r.channel, { min: r.date, max: r.date });
    }
  }

  // Remove existing rows that overlap with new data's channel+dateRange
  const filtered = existing.filter((r) => {
    const range = channelRanges.get(r.channel);
    if (!range) return true; // channel not in new data → keep
    return r.date < range.min || r.date > range.max;
  });

  // Add new data and sort
  const merged = [...filtered, ...newData];
  merged.sort((a, b) => a.date.localeCompare(b.date) || a.channel.localeCompare(b.channel));

  return merged;
}

/* ------------------------------------------------------------------ */
/*  Rebuild full dataset from dailySales                               */
/* ------------------------------------------------------------------ */

/**
 * Recalculate all summary tables from dailySales + titleMaster.
 * Uses the extracted builder functions from excelConverter.ts.
 */
export function rebuildDataset(
  dailySales: DailySale[],
  existingTitleMaster: TitleMaster[],
): ConvertedData {
  const titleMaster = buildTitleMasterFromSales(dailySales, existingTitleMaster);
  const monthlySummary = buildMonthlySummary(dailySales);
  const titleSummary = buildTitleSummary(dailySales, titleMaster);
  const platformSummary = buildPlatformSummary(dailySales);

  return { dailySales, monthlySummary, titleSummary, platformSummary, titleMaster };
}
