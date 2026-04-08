import type { DetectedFormat } from './types';

// ============================================================
// Format Detection
// ============================================================

// 파일명에서 플랫폼 추측
export function guessPlatformFromFileName(fileName: string): string {
  const lower = fileName.toLowerCase();
  // 파일명에 플랫폼명이 직접 포함된 경우
  if (lower.includes('piccoma') || lower.includes('ピッコマ') || lower.includes('피코마')) return 'Piccoma';
  if (lower.includes('mechacomic') || lower.includes('mecha') || lower.includes('メチャ') || lower.includes('めちゃ') || lower.includes('메챠')) return 'Mechacomic';
  if (lower.includes('cmoa') || lower.includes('シーモア') || lower.includes('시모아')) return 'cmoa';
  if (lower.includes('line') && lower.includes('manga') || lower.includes('lineマンガ') || lower.includes('linemannga')) return 'LINEマンガ';
  if (lower.includes('ebookjapan') || lower.includes('ebook')) return 'ebookjapan';
  if (lower.includes('fanza')) return 'DMM（FANZA）';
  if (lower.includes('renta')) return 'Renta';
  if (lower.includes('u-next') || lower.includes('unext')) return 'U-NEXT';
  if (lower.includes('dmm') && !lower.includes('fanza')) return 'DMM';
  if (lower.includes('まんが王国') || lower.includes('mangaoukoku') || lower.includes('만화왕국')) return 'まんが王国';
  return '';
}

// 파일명에서 data_source 세부 종류 결정
export function detectSubSource(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes('app_kan_daily')) return 'sokuhochi_app_kan';
  if (lower.includes('sp_kan_daily')) return 'sokuhochi_sp_kan';
  if (lower.includes('app_daily')) return 'sokuhochi_app';
  if (lower.includes('sp_daily')) return 'sokuhochi_sp';
  if (lower.includes('product_kpi')) return 'sokuhochi_kpi';
  if (lower.includes('cmoa') || lower.includes('시모아') || lower.includes('シーモア')) return 'sokuhochi_cmoa';
  return 'sokuhochi';
}

export function detectFormat(fileName: string, headerSample?: string, isExcel?: boolean): DetectedFormat {
  const lower = fileName.toLowerCase();
  const name = fileName;
  const guessedPlatform = guessPlatformFromFileName(fileName);
  const subSource = detectSubSource(fileName);

  // ── 1단계: 파일명으로 확정 가능한 경우 ──

  if (name.includes('Weekly Report') || lower.includes('weekly_report') || lower.includes('weekly report')) {
    return { type: 'weekly_report', platform: '', isPreliminary: false, confidence: 'high', label: 'Weekly Report', subSource: 'weekly_report' };
  }

  // 누계 매출 메타데이터
  if (name.includes('누계') || name.includes('累計') || lower.includes('ruikei') || lower.includes('metadata')) {
    return { type: 'ruikei_metadata', platform: '', isPreliminary: false, confidence: 'high', label: '누계 매출 메타데이터', subSource: 'ruikei_metadata' };
  }

  if (lower.includes('product_kpi')) {
    return { type: 'piccoma_kpi' as DetectedFormat['type'], platform: guessedPlatform || 'Piccoma', isPreliminary: true, confidence: 'high', label: 'Piccoma KPI 속보치', subSource };
  }

  if (lower.includes('daily_sales_log') || lower.includes('sokuhochi') || lower.includes('速報')) {
    const subType = lower.includes('app_kan') ? 'APP単行本' : lower.includes('sp_kan') ? 'SP単行本' : lower.includes('sp_') ? 'SP' : lower.includes('app_') ? 'APP' : '';
    return {
      type: 'piccoma_sokuhochi', platform: guessedPlatform, isPreliminary: true,
      confidence: guessedPlatform ? 'high' : 'medium',
      label: subType ? `${subType} 속보치` : '속보치', subSource,
    };
  }

  if (lower.includes('cmoa') || lower.includes('シーモア') || lower.includes('시모아')) {
    return { type: 'cmoa_sokuhochi', platform: 'cmoa', isPreliminary: true, confidence: 'high', label: 'cmoa 속보치', subSource: isExcel ? 'sokuhochi_cmoa_excel' : 'sokuhochi_cmoa' };
  }

  // ── 2단계: 헤더/내용으로 포맷 감지 ──
  if (headerSample) {
    if (headerSample.includes('日付') && headerSample.includes('ブック名') && headerSample.includes('購入ポイント数')) {
      return { type: 'piccoma_sokuhochi', platform: guessedPlatform, isPreliminary: true, confidence: guessedPlatform ? 'high' : 'medium', label: '속보치 CSV', subSource };
    }
    if (headerSample.includes('作品名') && headerSample.includes('Total売上')) {
      return { type: 'piccoma_kpi' as DetectedFormat['type'], platform: guessedPlatform || 'Piccoma', isPreliminary: true, confidence: 'high', label: 'Piccoma KPI 속보치', subSource: 'sokuhochi_kpi' };
    }
    if (headerSample.includes('コンテンツID') && headerSample.includes('タイトル名')) {
      return { type: 'cmoa_sokuhochi', platform: 'cmoa', isPreliminary: true, confidence: 'high', label: 'cmoa 속보치', subSource: 'sokuhochi_cmoa' };
    }
    if (headerSample.includes('Title') && headerSample.includes('Channel') && headerSample.includes('Date')) {
      return { type: 'weekly_report', platform: '', isPreliminary: false, confidence: 'medium', label: 'Weekly Report CSV', subSource: 'weekly_report' };
    }
  }

  if (isExcel) {
    return { type: 'weekly_report', platform: guessedPlatform, isPreliminary: false, confidence: 'low', label: 'Excel', subSource: 'weekly_report' };
  }

  return { type: 'unknown', platform: '', isPreliminary: false, confidence: 'low', label: '알 수 없음', subSource: 'sokuhochi' };
}
