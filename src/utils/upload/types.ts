// ============================================================
// Upload Types
// ============================================================

export interface ParsedRow {
  title_jp: string;
  title_kr: string;
  channel_title_jp: string;
  channel: string;
  sale_date: string;
  sales_amount: number;          // 세후 금액 (분석/표시용)
  sales_amount_gross?: number;   // 세전 원본 금액 (있을 때만)
}

export interface ValidationWarning {
  rowIndex: number;
  type: 'platform' | 'amount' | 'date';
  message: string;
  severity: 'warning' | 'error';
}

export type UploadStatus = 'idle' | 'parsing' | 'preview' | 'uploading' | 'success' | 'error';

export interface UploadResult {
  inserted: number;
  updated: number;
  errors: number;
  errorRows?: Array<{ row: number; message: string }>;
}

export interface DetectedFormat {
  type: 'piccoma_sokuhochi' | 'piccoma_kpi' | 'cmoa_sokuhochi' | 'cmoa_excel' | 'weekly_report' | 'unknown';
  platform: string;
  isPreliminary: boolean;
  confidence: 'high' | 'medium' | 'low';
  label: string;
  subSource: string; // DB data_source 값 (sokuhochi_app, sokuhochi_sp 등)
}
