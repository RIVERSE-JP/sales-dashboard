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
  if (lower.includes('fanza')) return 'DMM(FANZA)';
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

  // Renta 속보치 (월간 파일 + 일별 컬럼)
  if (lower.includes('renta')) {
    return { type: 'renta_sokuhochi', platform: 'Renta', isPreliminary: true, confidence: 'high', label: 'Renta 속보치', subSource: 'sokuhochi_renta' };
  }

  // LINE Manga 속보치
  if (lower.includes('line_sales_report') || (lower.includes('line') && lower.includes('.csv'))) {
    return { type: 'linemanga_sokuhochi', platform: 'LINEマンガ', isPreliminary: true, confidence: 'high', label: 'LINEマンガ 속보치', subSource: 'sokuhochi_line' };
  }

  // ebookjapan 속보치 (파일명에 PaymentReport, DailyDetail 등)
  if (lower.includes('paymentreport') || lower.includes('dailydetail') || lower.includes('ebookjapan') || lower.includes('ebj')) {
    return { type: 'ebookjapan_sokuhochi', platform: 'ebookjapan', isPreliminary: true, confidence: 'high', label: 'ebookjapan 속보치', subSource: 'sokuhochi_ebj' };
  }

  // DMM 속보치 — 파일명에 DMM 또는 FANZA
  if (name.includes('DMM') || name.includes('商品別売上') || lower.includes('fanza') || lower.includes('dmm')) {
    return { type: 'dmm_sokuhochi', platform: 'DMM', isPreliminary: true, confidence: 'high', label: 'DMM 속보치', subSource: 'sokuhochi_dmm' };
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
    // Renta: 参照ID + 商品名 + 売上金額
    if (headerSample.includes('参照ID') && headerSample.includes('商品名') && headerSample.includes('売上金額')) {
      return { type: 'renta_sokuhochi', platform: 'Renta', isPreliminary: true, confidence: 'high', label: 'Renta 속보치', subSource: 'sokuhochi_renta' };
    }
    // ebookjapan: 書店名 + 販売額計
    if (headerSample.includes('書店名') && headerSample.includes('販売額計')) {
      return { type: 'ebookjapan_sokuhochi', platform: 'ebookjapan', isPreliminary: true, confidence: 'high', label: 'ebookjapan 속보치', subSource: 'sokuhochi_ebj' };
    }
    // LINE Manga: 作品ID + 取扱高
    if (headerSample.includes('作品ID') && headerSample.includes('取扱高')) {
      return { type: 'linemanga_sokuhochi', platform: 'LINEマンガ', isPreliminary: true, confidence: 'high', label: 'LINEマンガ 속보치', subSource: 'sokuhochi_line' };
    }
    // DMM: 商品タイトル + 売上金額 + 集計期間/カテゴリ
    if (headerSample.includes('商品タイトル') && headerSample.includes('売上金額') && (headerSample.includes('集計期間') || headerSample.includes('カテゴリ'))) {
      return { type: 'dmm_sokuhochi', platform: 'DMM', isPreliminary: true, confidence: 'high', label: 'DMM 속보치', subSource: 'sokuhochi_dmm' };
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
