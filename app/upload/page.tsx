'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Trash2, Clock, ChevronDown, ChevronUp, X } from 'lucide-react';
import { supabase, upsertDailySales } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import type { UploadLog } from '@/types';
import ExcelJS from 'exceljs';

const GLASS_CARD = {
  background: 'var(--color-glass)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid var(--color-glass-border)',
  borderRadius: '16px',
} as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

interface ParsedRow {
  title_jp: string;
  title_kr: string;
  channel_title_jp: string;
  channel: string;
  sale_date: string;
  sales_amount: number;
}

interface ValidationWarning {
  rowIndex: number;
  type: 'platform' | 'amount' | 'date';
  message: string;
  severity: 'warning' | 'error';
}

type UploadStatus = 'idle' | 'parsing' | 'preview' | 'uploading' | 'success' | 'error';

interface UploadResult {
  inserted: number;
  updated: number;
  errors: number;
  errorRows?: Array<{ row: number; message: string }>;
}

// ============================================================
// Toast Component
// ============================================================

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
      style={{
        background: type === 'success' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
        color: 'white',
        backdropFilter: 'blur(8px)',
      }}
    >
      {type === 'success' ? <CheckCircle size={16} /> : <X size={16} />}
      {message}
    </motion.div>
  );
}

// ============================================================
// Confirm Dialog
// ============================================================

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="rounded-2xl p-6 max-w-sm w-full mx-4"
        style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-glass-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-primary)' }}>{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-medium cursor-pointer" style={{ background: 'var(--color-input-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-input-border)' }}>
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            OK
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// CSV Parser
// ============================================================

function parseCSVText(text: string): string[][] {
  const lines: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',' || ch === '\t') {
        row.push(current.trim());
        current = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(current.trim());
        if (row.some((c) => c !== '')) lines.push(row);
        row = [];
        current = '';
      } else {
        current += ch;
      }
    }
  }
  if (current || row.length > 0) {
    row.push(current.trim());
    if (row.some((c) => c !== '')) lines.push(row);
  }
  return lines;
}

function parseCSVWeeklyReport(text: string): ParsedRow[] {
  const lines = parseCSVText(text);
  if (lines.length < 2) return [];
  const rows: ParsedRow[] = [];
  // Find header row
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (lines[i].some((c) => c.includes('Title') || c.includes('Channel') || c.includes('Date'))) {
      headerIdx = i;
      break;
    }
  }
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const vals = lines[i];
    const titleJP = (vals[0] ?? '').trim();
    const titleKR = (vals[1] ?? '').trim();
    const channelTitleJP = (vals[2] ?? '').trim();
    const channel = (vals[3] ?? '').trim();
    const rawDate = (vals[4] ?? '').trim();
    const rawAmount = (vals[5] ?? '').trim();
    if (!titleJP || !channel) continue;
    const saleDate = parseDateString(rawDate);
    const salesAmount = parseInt(rawAmount.replace(/[¥,]/g, ''), 10) || 0;
    if (saleDate && salesAmount > 0) {
      rows.push({ title_jp: titleJP, title_kr: titleKR, channel_title_jp: channelTitleJP, channel, sale_date: saleDate, sales_amount: salesAmount });
    }
  }
  return rows;
}

/**
 * 속보치 CSV 파싱 (Shift-JIS 디코딩은 호출부에서 처리)
 * 헤더: 日付,取次店書籍ID,ブックID,ブック名,チャプタID/巻ID,チャプタ名/巻名,話数番号/巻番号,著者名,出版社名,価格,購入件数,購入ポイント数
 * 작품(ブック名) 기준으로 일별 합산
 */
function parseCSVSokuhochi(text: string, channel: string): ParsedRow[] {
  const lines = parseCSVText(text);
  if (lines.length < 2) return [];

  // Find header row — look for 日付 or ブック名
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (lines[i].some((c) => c.includes('日付') || c.includes('ブック名') || c.includes('購入ポイント数'))) {
      headerIdx = i;
      break;
    }
  }

  // Aggregate by (titleJP, date) — sum 購入ポイント数
  const salesMap = new Map<string, Map<string, number>>();

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = lines[i];
    const rawDate = (cols[0] ?? '').trim();   // 日付 (YYYY/MM/DD)
    const titleJP = (cols[3] ?? '').trim();   // ブック名
    const rawAmount = (cols[11] ?? '').trim(); // 購入ポイント数

    if (!rawDate || !titleJP) continue;

    const saleDate = parseDateString(rawDate);
    const amount = parseInt(rawAmount.replace(/[¥,]/g, ''), 10) || 0;

    if (!saleDate || amount <= 0) continue;

    if (!salesMap.has(titleJP)) salesMap.set(titleJP, new Map());
    const dateMap = salesMap.get(titleJP)!;
    dateMap.set(saleDate, (dateMap.get(saleDate) || 0) + amount);
  }

  // Convert to ParsedRow[]
  const rows: ParsedRow[] = [];
  for (const [titleJP, dateMap] of salesMap) {
    for (const [date, amount] of dateMap) {
      rows.push({
        title_jp: titleJP,
        title_kr: '',
        channel_title_jp: titleJP,
        channel,
        sale_date: date,
        sales_amount: amount,
      });
    }
  }

  return rows;
}

function parseDateString(raw: string): string {
  const cleaned = raw.replace(/\//g, '-');
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(cleaned)) {
    const parts = cleaned.split('-');
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  return '';
}

// ============================================================
// Excel Parsers (unchanged logic)
// ============================================================

async function parseWeeklyReport(buffer: ArrayBuffer): Promise<ParsedRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const dailySheet = wb.worksheets.find((ws) =>
    ws.name.toLowerCase().includes('daily_raw') || ws.name.toLowerCase().includes('daily')
  ) ?? wb.worksheets[0];
  if (!dailySheet) return [];
  const rows: ParsedRow[] = [];
  let headerRow = -1;
  dailySheet.eachRow((row, rowNumber) => {
    if (headerRow > 0) return;
    const vals = row.values as (string | null | undefined)[];
    if (vals.some((v) => typeof v === 'string' && (v.includes('Title') || v.includes('Channel') || v.includes('Date')))) {
      headerRow = rowNumber;
    }
  });
  if (headerRow < 0) headerRow = 2;
  dailySheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return;
    const vals = row.values as (string | number | Date | null | undefined)[];
    const titleJP = String(vals[1] ?? '').trim();
    const titleKR = String(vals[2] ?? '').trim();
    const channelTitleJP = String(vals[3] ?? '').trim();
    const channel = String(vals[4] ?? '').trim();
    const rawDate = vals[5];
    const rawAmount = vals[6];
    if (!titleJP || !channel) return;
    let saleDate = '';
    if (rawDate instanceof Date) {
      saleDate = rawDate.toISOString().slice(0, 10);
    } else if (typeof rawDate === 'string') {
      saleDate = parseDateString(rawDate);
    } else if (typeof rawDate === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const d = new Date(excelEpoch.getTime() + rawDate * 86400000);
      saleDate = d.toISOString().slice(0, 10);
    }
    const salesAmount = typeof rawAmount === 'number' ? rawAmount : parseInt(String(rawAmount ?? '0').replace(/[¥,]/g, ''), 10) || 0;
    if (saleDate && salesAmount > 0) {
      rows.push({ title_jp: titleJP, title_kr: titleKR, channel_title_jp: channelTitleJP, channel, sale_date: saleDate, sales_amount: salesAmount });
    }
  });
  return rows;
}

async function parseSokuhochi(buffer: ArrayBuffer): Promise<ParsedRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  if (!sheet) return [];
  const rows: ParsedRow[] = [];
  let headerRow = -1;
  sheet.eachRow((row, rowNumber) => {
    if (headerRow > 0) return;
    const vals = row.values as (string | null | undefined)[];
    if (vals.some((v) => typeof v === 'string' && (v.includes('作品') || v.includes('タイトル') || v.includes('売上')))) {
      headerRow = rowNumber;
    }
  });
  if (headerRow < 0) headerRow = 1;
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return;
    const vals = row.values as (string | number | Date | null | undefined)[];
    const titleJP = String(vals[1] ?? '').trim();
    const channel = String(vals[2] ?? '').trim();
    const rawDate = vals[3];
    const rawAmount = vals[4];
    if (!titleJP) return;
    let saleDate = '';
    if (rawDate instanceof Date) {
      saleDate = rawDate.toISOString().slice(0, 10);
    } else if (typeof rawDate === 'string') {
      saleDate = parseDateString(rawDate);
    } else if (typeof rawDate === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const d = new Date(excelEpoch.getTime() + rawDate * 86400000);
      saleDate = d.toISOString().slice(0, 10);
    }
    const salesAmount = typeof rawAmount === 'number' ? rawAmount : parseInt(String(rawAmount ?? '0').replace(/[¥,]/g, ''), 10) || 0;
    if (saleDate && salesAmount > 0) {
      rows.push({ title_jp: titleJP, title_kr: '', channel_title_jp: '', channel, sale_date: saleDate, sales_amount: salesAmount });
    }
  });
  return rows;
}

// ============================================================
// Main Component
// ============================================================

export default function DataUploadPage() {
  const { t } = useApp();

  const [status, setStatus] = useState<UploadStatus>('idle');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'weekly_report' | 'sokuhochi'>('weekly_report');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLogs, setUploadLogs] = useState<UploadLog[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastUploadTime, setLastUploadTime] = useState<string | null>(null);

  // Sokuhochi CSV platform selection
  const [sokuhochiPlatform, setSokuhochiPlatform] = useState<string>('');
  const [pendingSokuhochiFile, setPendingSokuhochiFile] = useState<File | null>(null);

  // New title detection
  const [knownTitles, setKnownTitles] = useState<Set<string>>(new Set());
  const [newTitles, setNewTitles] = useState<string[]>([]);

  // Validation warnings
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);
  const [showWarnings, setShowWarnings] = useState(false);

  // Upload log detail
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Toast & Confirm
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // Known platforms (for validation)
  const [knownPlatforms, setKnownPlatforms] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/sales/platforms')
      .then((res) => res.json())
      .then((data: Array<{ channel_name?: string; name?: string } | string>) => {
        if (data && Array.isArray(data)) {
          const names = data.map((d) => (typeof d === 'string' ? d : d.channel_name || d.name || ''));
          setKnownPlatforms(names.filter(Boolean));
        }
      })
      .catch(() => {});
  }, []);

  // Fetch known titles for new title detection
  useEffect(() => {
    fetch('/api/sales/title-master')
      .then((res) => res.json())
      .then((data: Array<{ title_jp?: string }>) => {
        if (data && Array.isArray(data)) {
          setKnownTitles(new Set(data.map((d) => d.title_jp || '').filter(Boolean)));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    supabase
      .from('upload_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setUploadLogs(data as UploadLog[]);
      });
  }, [status]);

  const detectFileType = (name: string): 'weekly_report' | 'sokuhochi' => {
    const lower = name.toLowerCase();
    // 속보치 CSV: app_daily_sales_log, sp_daily_sales_log, app_kan_daily_sales_log, sp_kan_daily_sales_log
    if (lower.includes('daily_sales_log') || lower.includes('sokuhochi') || lower.includes('速報')) return 'sokuhochi';
    return 'weekly_report';
  };

  // Detect new titles from parsed rows
  const detectNewTitles = useCallback((rows: ParsedRow[]) => {
    if (knownTitles.size === 0) return [];
    const uniqueTitles = new Set(rows.map((r) => r.title_jp));
    return Array.from(uniqueTitles).filter((t) => !knownTitles.has(t));
  }, [knownTitles]);

  // Validate parsed rows
  const validateRows = useCallback((rows: ParsedRow[], platforms: string[]): ValidationWarning[] => {
    const warns: ValidationWarning[] = [];
    const amounts = rows.map((r) => r.sales_amount);
    const avgAmount = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;

    rows.forEach((row, idx) => {
      // Unknown platform
      if (platforms.length > 0 && row.channel && !platforms.includes(row.channel)) {
        warns.push({ rowIndex: idx, type: 'platform', severity: 'warning', message: t(`알 수 없는 플랫폼: ${row.channel}`, `不明なプラットフォーム: ${row.channel}`) });
      }
      // Negative amount
      if (row.sales_amount < 0) {
        warns.push({ rowIndex: idx, type: 'amount', severity: 'error', message: t(`음수 매출: ¥${row.sales_amount.toLocaleString()}`, `マイナス売上: ¥${row.sales_amount.toLocaleString()}`) });
      }
      // Abnormally large amount (10x average)
      if (avgAmount > 0 && row.sales_amount > avgAmount * 10) {
        warns.push({ rowIndex: idx, type: 'amount', severity: 'warning', message: t(`비정상 매출 (평균의 ${Math.round(row.sales_amount / avgAmount)}배)`, `異常な売上 (平均の${Math.round(row.sales_amount / avgAmount)}倍)`) });
      }
      // Date format check
      if (!row.sale_date || !/^\d{4}-\d{2}-\d{2}$/.test(row.sale_date)) {
        warns.push({ rowIndex: idx, type: 'date', severity: 'error', message: t(`날짜 형식 오류: ${row.sale_date || '(empty)'}`, `日付形式エラー: ${row.sale_date || '(空)'}`) });
      }
    });

    return warns;
  }, [t]);

  // Process sokuhochi CSV after platform is selected
  const processSokuhochiFile = useCallback(async (file: File, platform: string) => {
    setStatus('parsing');
    setFileName(file.name);
    setErrorMessage('');
    setUploadResult(null);
    setWarnings([]);
    setNewTitles([]);
    setFileType('sokuhochi');

    try {
      const isCSV = file.name.toLowerCase().endsWith('.csv');
      let rows: ParsedRow[];

      if (isCSV) {
        // Shift-JIS decoding for sokuhochi CSV
        const buffer = await file.arrayBuffer();
        const decoder = new TextDecoder('shift_jis');
        const text = decoder.decode(buffer);
        rows = parseCSVSokuhochi(text, platform);
      } else {
        const buffer = await file.arrayBuffer();
        rows = await parseSokuhochi(buffer);
        // Override channel with selected platform
        rows = rows.map((r) => ({ ...r, channel: platform }));
      }

      if (rows.length === 0) {
        setStatus('error');
        setErrorMessage(t('데이터를 찾을 수 없습니다. 파일 형식을 확인해주세요.', 'データが見つかりませんでした。ファイル形式を確認してください。'));
        return;
      }

      setParsedRows(rows);
      const detected = detectNewTitles(rows);
      setNewTitles(detected);
      const warns = validateRows(rows, knownPlatforms);
      setWarnings(warns);
      if (warns.length > 0) setShowWarnings(true);
      setStatus('preview');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : t('파일 분석에 실패했습니다', 'ファイルの解析に失敗しました'));
    }
  }, [t, knownPlatforms, validateRows, detectNewTitles]);

  const handleFile = useCallback(async (file: File) => {
    const detectedType = detectFileType(file.name);

    // For sokuhochi CSV, show platform selection first
    if (detectedType === 'sokuhochi') {
      setPendingSokuhochiFile(file);
      setFileName(file.name);
      setFileType('sokuhochi');
      setStatus('idle');
      return;
    }

    setStatus('parsing');
    setFileName(file.name);
    setErrorMessage('');
    setUploadResult(null);
    setWarnings([]);
    setNewTitles([]);
    setFileType(detectedType);
    try {
      const isCSV = file.name.toLowerCase().endsWith('.csv');
      let rows: ParsedRow[];

      if (isCSV) {
        const text = await file.text();
        rows = parseCSVWeeklyReport(text);
      } else {
        const buffer = await file.arrayBuffer();
        rows = await parseWeeklyReport(buffer);
      }

      if (rows.length === 0) {
        setStatus('error');
        setErrorMessage(t('데이터를 찾을 수 없습니다. 파일 형식을 확인해주세요.', 'データが見つかりませんでした。ファイル形式を確認してください。'));
        return;
      }
      setParsedRows(rows);
      const detected = detectNewTitles(rows);
      setNewTitles(detected);
      const warns = validateRows(rows, knownPlatforms);
      setWarnings(warns);
      if (warns.length > 0) setShowWarnings(true);
      setStatus('preview');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : t('파일 분석에 실패했습니다', 'ファイルの解析に失敗しました'));
    }
  }, [t, knownPlatforms, validateRows, detectNewTitles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      handleFile(file);
    } else {
      setErrorMessage(t('.xlsx / .csv 파일만 지원됩니다', '.xlsx / .csv ファイルのみ対応しています'));
    }
  }, [handleFile, t]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleUpload = async () => {
    setStatus('uploading');
    setUploadProgress(0);
    const isPreliminary = fileType === 'sokuhochi';
    try {
      const batchSize = 500;
      let totalInserted = 0;
      let totalUpdated = 0;
      for (let i = 0; i < parsedRows.length; i += batchSize) {
        const batch = parsedRows.slice(i, i + batchSize);
        const result = await upsertDailySales(batch, fileType, isPreliminary);
        totalInserted += result.inserted;
        totalUpdated += result.updated;
        setUploadProgress(Math.round(((i + batchSize) / parsedRows.length) * 100));
      }
      const now = new Date().toISOString();
      setLastUploadTime(now);
      setUploadResult({ inserted: totalInserted, updated: totalUpdated, errors: 0 });
      setStatus('success');
      await supabase.from('upload_logs').insert({
        upload_type: fileType,
        source_file: fileName,
        row_count: parsedRows.length,
        status: 'success',
      });
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : t('업로드에 실패했습니다', 'アップロードに失敗しました'));
    }
  };

  const reset = () => {
    setStatus('idle');
    setParsedRows([]);
    setFileName('');
    setUploadResult(null);
    setErrorMessage('');
    setUploadProgress(0);
    setWarnings([]);
    setShowWarnings(false);
    setLastUploadTime(null);
    setPendingSokuhochiFile(null);
    setSokuhochiPlatform('');
    setNewTitles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Undo last upload - use date range of uploaded rows as filter
  const handleUndoUpload = () => {
    if (!lastUploadTime || parsedRows.length === 0) return;
    const dates = parsedRows.map((r) => r.sale_date).filter(Boolean).sort();
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    const dataSource = fileType;
    setConfirmDialog({
      message: t('방금 업로드한 데이터를 모두 삭제하시겠습니까?', '直前のアップロードデータを全て削除しますか？'),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch('/api/manage/sales/batch-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate, endDate, dataSource }),
          });
          if (!res.ok) throw new Error('Undo failed');
          setToast({ message: t('업로드 취소 완료', 'アップロード取り消し完了'), type: 'success' });
          setLastUploadTime(null);
          reset();
        } catch {
          setToast({ message: t('취소 실패', '取り消しに失敗しました'), type: 'error' });
        }
      },
    });
  };

  // Cancel an upload log - use data_source filter matching the upload type
  const handleCancelLog = (log: UploadLog) => {
    setConfirmDialog({
      message: t(`"${log.source_file}" 업로드 건을 삭제하시겠습니까?`, `「${log.source_file}」のアップロード分を削除しますか？`),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch('/api/manage/sales/batch-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataSource: log.upload_type }),
          });
          if (!res.ok) throw new Error('Cancel failed');
          setToast({ message: t('삭제 완료', '削除しました'), type: 'success' });
          // Refresh logs
          const { data } = await supabase.from('upload_logs').select('*').order('created_at', { ascending: false }).limit(20);
          if (data) setUploadLogs(data as UploadLog[]);
        } catch {
          setToast({ message: t('삭제 실패', '削除に失敗しました'), type: 'error' });
        }
      },
    });
  };

  // Warning counts
  const warningCount = useMemo(() => warnings.filter((w) => w.severity === 'warning').length, [warnings]);
  const errorCount = useMemo(() => warnings.filter((w) => w.severity === 'error').length, [warnings]);

  // Row warning lookup for preview
  const rowWarnings = useMemo(() => {
    const map = new Map<number, ValidationWarning[]>();
    warnings.forEach((w) => {
      const list = map.get(w.rowIndex) || [];
      list.push(w);
      map.set(w.rowIndex, list);
    });
    return map;
  }, [warnings]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* Confirm Dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <ConfirmDialog message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(null)} />
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center page-icon-glow">
          <Upload size={20} color="white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('데이터 업로드', 'データアップロード')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('엑셀/CSV 파일로 데이터 업로드', 'Excel/CSVファイルからデータをアップロード')}
          </p>
        </div>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={cardVariants}>
          <AnimatePresence mode="wait">
            {status === 'idle' && !pendingSokuhochiFile && (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all"
                style={{
                  ...GLASS_CARD,
                  border: dragOver ? '2px dashed rgba(129, 140, 248, 0.6)' : '2px dashed var(--color-glass-border)',
                  background: dragOver ? 'rgba(59, 111, 246, 0.06)' : 'var(--color-glass)',
                  minHeight: 240,
                }}
              >
                <motion.div animate={{ y: dragOver ? -8 : 0 }} className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, rgba(59,111,246,0.15), rgba(59,111,246,0.15))' }}>
                  <FileSpreadsheet size={32} color="#3B6FF6" />
                </motion.div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{t('파일을 드래그 앤 드롭', 'ファイルをドラッグ＆ドロップ')}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('Excel (.xlsx) / CSV (.csv) 지원', 'Excel (.xlsx) / CSV (.csv) に対応')}</p>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileInput} className="hidden" />
              </motion.div>
            )}

            {/* Sokuhochi CSV: Platform selection */}
            {status === 'idle' && pendingSokuhochiFile && (
              <motion.div
                key="sokuhochi-platform"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="rounded-2xl p-8"
                style={GLASS_CARD}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.2))' }}>
                    <FileSpreadsheet size={20} color="#fbbf24" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {t('속보치 CSV', '速報値 CSV')}
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{fileName}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('플랫폼 선택 (필수)', 'プラットフォーム選択（必須）')}
                  </label>
                  <select
                    value={sokuhochiPlatform}
                    onChange={(e) => setSokuhochiPlatform(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm cursor-pointer"
                    style={{
                      background: 'var(--color-input-bg)',
                      color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-input-border)',
                      outline: 'none',
                    }}
                  >
                    <option value="">{t('-- 플랫폼을 선택하세요 --', '-- プラットフォームを選択 --')}</option>
                    {knownPlatforms.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="px-3 py-2 rounded-xl mb-6 text-xs" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                  {t(
                    '속보치 데이터는 속보(잠정)값으로 저장됩니다.',
                    '速報値データは速報（暫定）値として保存されます。'
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={reset}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
                    style={{ background: 'var(--color-input-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-input-border)' }}
                  >
                    <X size={14} />{t('취소', 'キャンセル')}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      if (!sokuhochiPlatform) return;
                      processSokuhochiFile(pendingSokuhochiFile, sokuhochiPlatform);
                    }}
                    disabled={!sokuhochiPlatform}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer btn-gradient"
                    style={{ opacity: sokuhochiPlatform ? 1 : 0.4 }}
                  >
                    <Upload size={14} />{t('분석 시작', '解析開始')}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {status === 'parsing' && (
              <motion.div key="parsing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl p-12 flex flex-col items-center justify-center" style={{ ...GLASS_CARD, minHeight: 240 }}>
                <Loader2 size={40} color="#3B6FF6" className="animate-spin mb-4" />
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('분석 중...', '解析中...')}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{fileName}</p>
              </motion.div>
            )}

            {status === 'preview' && (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl p-6" style={GLASS_CARD}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('미리보기', 'プレビュー')}</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {fileName} | {parsedRows.length.toLocaleString()} {t('행', '行')} | {t('타입', 'タイプ')}: {fileType === 'weekly_report' ? 'Weekly Report' : t('속보치', '速報値')}
                      {fileType === 'sokuhochi' && sokuhochiPlatform && (
                        <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                          {sokuhochiPlatform}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={reset} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer" style={{ background: 'var(--color-input-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-input-border)' }}>
                      <Trash2 size={14} />{t('취소', 'キャンセル')}
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleUpload} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer btn-gradient">
                      <Upload size={14} />{t('업로드', 'アップロード')} ({parsedRows.length}{t('행', '行')})
                    </motion.button>
                  </div>
                </div>

                {/* Warnings banner */}
                {warnings.length > 0 && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowWarnings(!showWarnings)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                      style={{
                        background: errorCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                        border: `1px solid ${errorCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                        color: errorCount > 0 ? '#f87171' : '#fbbf24',
                      }}
                    >
                      <AlertCircle size={14} />
                      {warningCount > 0 && <span>{warningCount}{t('건 경고', '件の警告')}</span>}
                      {errorCount > 0 && <span>{errorCount}{t('건 오류', '件のエラー')}</span>}
                      {showWarnings ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
                    </button>
                    <AnimatePresence>
                      {showWarnings && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-2 max-h-40 overflow-y-auto rounded-xl px-3 py-2 space-y-1"
                          style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)' }}
                        >
                          {warnings.map((w, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                              <span style={{ color: w.severity === 'error' ? '#f87171' : '#fbbf24' }}>
                                {w.severity === 'error' ? '\u2715' : '\u26A0\uFE0F'}
                              </span>
                              <span style={{ color: 'var(--color-text-muted)' }}>#{w.rowIndex + 1}</span>
                              <span style={{ color: 'var(--color-text-secondary)' }}>{w.message}</span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* New titles warning */}
                {newTitles.length > 0 && (
                  <div className="mb-4 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertCircle size={14} color="#fbbf24" />
                      <span className="text-xs font-semibold" style={{ color: '#fbbf24' }}>
                        {t(
                          `${newTitles.length}개의 신규 작품이 발견되었습니다. 업로드하면 매출 데이터에 추가됩니다.`,
                          `${newTitles.length}件の新規タイトルが見つかりました。アップロードすると売上データに追加されます。`
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {newTitles.slice(0, 10).map((title) => (
                        <span
                          key={title}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' }}
                        >
                          {t('신규', '新規')} {title}
                        </span>
                      ))}
                      {newTitles.length > 10 && (
                        <span className="text-[10px] px-2 py-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          ... {t('외', '他')} {newTitles.length - 10}{t('개', '件')}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--color-table-border)' }}>
                  <table className="w-full text-xs min-w-[600px]">
                    <thead>
                      <tr style={{ background: 'var(--color-glass)', borderBottom: '1px solid var(--color-table-border)' }}>
                        <th className="py-2.5 px-3 text-left font-medium" style={{ color: 'var(--color-text-secondary)' }}>#</th>
                        <th className="py-2.5 px-3 text-left font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('작품(JP)', 'タイトル(JP)')}</th>
                        <th className="py-2.5 px-3 text-left font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('플랫폼', 'チャンネル')}</th>
                        <th className="py-2.5 px-3 text-left font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('날짜', '日付')}</th>
                        <th className="py-2.5 px-3 text-right font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('매출', '売上')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 20).map((row, idx) => {
                        const rowWarns = rowWarnings.get(idx);
                        const hasError = rowWarns?.some((w) => w.severity === 'error');
                        const hasWarning = rowWarns?.some((w) => w.severity === 'warning');

                        return (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: '1px solid var(--color-table-border-subtle)',
                              background: hasError
                                ? 'rgba(239, 68, 68, 0.08)'
                                : hasWarning
                                  ? 'rgba(251, 191, 36, 0.08)'
                                  : undefined,
                            }}
                          >
                            <td className="py-2.5 px-3" style={{ color: 'var(--color-text-muted)' }}>
                              {hasError && <span className="mr-1" style={{ color: '#f87171' }}>{'\u2715'}</span>}
                              {!hasError && hasWarning && <span className="mr-1" style={{ color: '#fbbf24' }}>{'\u26A0\uFE0F'}</span>}
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 max-w-[200px]" style={{ color: 'var(--color-text-primary)' }}>
                              <span className="truncate block">{row.title_jp}</span>
                              {newTitles.includes(row.title_jp) && (
                                <span className="inline-block text-[9px] px-1.5 py-0 rounded-full font-medium mt-0.5" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                                  {t('신규', '新規')}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3" style={{ color: 'var(--color-text-secondary)' }}>{row.channel}</td>
                            <td className="py-2.5 px-3 font-mono" style={{ color: 'var(--color-text-secondary)' }}>{row.sale_date}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold" style={{ color: 'var(--color-text-primary)' }}>¥{row.sales_amount.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {parsedRows.length > 20 && (
                    <div className="py-2 text-center text-xs" style={{ color: 'var(--color-text-muted)', background: 'var(--color-glass)' }}>
                      ... {t('외', '他')} {(parsedRows.length - 20).toLocaleString()} {t('행', '行')}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {status === 'uploading' && (
              <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl p-12 flex flex-col items-center justify-center" style={{ ...GLASS_CARD, minHeight: 240 }}>
                <Loader2 size={40} color="#3B6FF6" className="animate-spin mb-4" />
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{t('업로드 중...', 'アップロード中...')}</p>
                <div className="w-48 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-glass-border)' }}>
                  <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #1A2B5E, #3B6FF6)' }} initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.3 }} />
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>{uploadProgress}%</p>
              </motion.div>
            )}

            {status === 'success' && uploadResult && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="rounded-2xl p-12 flex flex-col items-center justify-center" style={{ ...GLASS_CARD, minHeight: 240 }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
                  <CheckCircle size={48} color="#22c55e" />
                </motion.div>
                <p className="text-lg font-bold mt-4 mb-4" style={{ color: 'var(--color-text-primary)' }}>{t('업로드 완료', 'アップロード完了')}</p>

                {/* Result cards */}
                <div className="flex gap-4 mb-6">
                  <div className="text-center px-4 py-3 rounded-xl" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{uploadResult.inserted}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('신규 추가', '新規追加')}</p>
                  </div>
                  <div className="text-center px-4 py-3 rounded-xl" style={{ background: 'rgba(59, 111, 246, 0.1)', border: '1px solid rgba(59, 111, 246, 0.2)' }}>
                    <p className="text-2xl font-bold" style={{ color: '#3B6FF6' }}>{uploadResult.updated}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('업데이트', '更新')}</p>
                  </div>
                  {uploadResult.errors > 0 && (
                    <div className="text-center px-4 py-3 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <p className="text-2xl font-bold" style={{ color: '#f87171' }}>{uploadResult.errors}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('에러', 'エラー')}</p>
                    </div>
                  )}
                </div>

                {/* Error rows detail */}
                {uploadResult.errorRows && uploadResult.errorRows.length > 0 && (
                  <div className="w-full max-w-md mb-4 rounded-xl p-3 max-h-32 overflow-y-auto" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    {uploadResult.errorRows.map((er, i) => (
                      <div key={i} className="text-xs py-0.5 flex gap-2" style={{ color: '#f87171' }}>
                        <span>#{er.row}</span>
                        <span>{er.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  {lastUploadTime && (
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={handleUndoUpload}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                      style={{ background: 'transparent', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}
                    >
                      {t('업로드 취소', 'アップロード取消')}
                    </motion.button>
                  )}
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={reset} className="px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer" style={{ background: 'var(--color-glass-border)', color: 'var(--color-text-primary)', border: '1px solid var(--color-glass-border)' }}>
                    {t('새로 업로드', '新規アップロード')}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div key="error" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="rounded-2xl p-12 flex flex-col items-center justify-center" style={{ ...GLASS_CARD, minHeight: 240 }}>
                <AlertCircle size={48} color="#ef4444" />
                <p className="text-lg font-bold mt-4 mb-2" style={{ color: 'var(--color-text-primary)' }}>{t('오류', 'エラー')}</p>
                <p className="text-sm text-center max-w-md" style={{ color: 'var(--color-text-secondary)' }}>{errorMessage}</p>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={reset} className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer" style={{ background: 'var(--color-glass-border)', color: 'var(--color-text-primary)', border: '1px solid var(--color-glass-border)' }}>
                  {t('다시 시도', 'やり直す')}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Upload History */}
        <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
          <div className="flex items-center gap-3 mb-4">
            <Clock size={16} color="var(--color-text-secondary)" />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('업로드 이력', 'アップロード履歴')}</h2>
          </div>
          {uploadLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-table-border)' }}>
                    <th className="py-2.5 px-2 text-left font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('일시', '日時')}</th>
                    <th className="py-2.5 px-2 text-left font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('타입', 'タイプ')}</th>
                    <th className="py-2.5 px-2 text-left font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('파일', 'ファイル')}</th>
                    <th className="py-2.5 px-2 text-right font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('행수', '行数')}</th>
                    <th className="py-2.5 px-2 text-center font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('상태', 'ステータス')}</th>
                    <th className="py-2.5 px-2 text-center font-medium" style={{ color: 'var(--color-text-secondary)' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {uploadLogs.map((log) => (
                    <>
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--color-table-border-subtle)' }}>
                        <td className="py-2.5 px-2 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {new Date(log.created_at).toLocaleString(t('ko-KR', 'ja-JP'), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: log.upload_type === 'sokuhochi' ? 'rgba(251,191,36,0.15)' : 'rgba(59,111,246,0.15)', color: log.upload_type === 'sokuhochi' ? '#fbbf24' : '#3B6FF6' }}>
                            {log.upload_type === 'weekly_report' ? 'WR' : t('속보', '速報')}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-xs truncate max-w-[200px]" style={{ color: 'var(--color-text-primary)' }}>{log.source_file ?? '-'}</td>
                        <td className="py-2.5 px-2 text-right font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>{log.row_count.toLocaleString()}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
                            background: log.status === 'success' ? 'rgba(34,197,94,0.15)' : log.status === 'cancelled' ? 'rgba(156,163,175,0.15)' : 'rgba(239,68,68,0.15)',
                            color: log.status === 'success' ? '#22c55e' : log.status === 'cancelled' ? '#9ca3af' : '#ef4444',
                          }}>
                            {log.status === 'success' ? t('성공', '成功') : log.status === 'cancelled' ? t('취소됨', 'キャンセル済') : t('오류', 'エラー')}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <button
                              onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                              className="text-[10px] px-2 py-1 rounded-full cursor-pointer"
                              style={{ background: 'rgba(59, 111, 246, 0.1)', color: '#3B6FF6', border: '1px solid rgba(59, 111, 246, 0.2)' }}
                            >
                              {t('상세', '詳細')}
                            </button>
                            {log.status === 'success' && (
                              <button
                                onClick={() => handleCancelLog(log)}
                                className="text-[10px] px-2 py-1 rounded-full cursor-pointer"
                                style={{ background: 'transparent', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                              >
                                {t('취소', '取消')}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                const pw = prompt(t('삭제 비밀번호를 입력하세요', '削除パスワードを入力'));
                                if (pw !== 'CLINK') {
                                  if (pw !== null) alert(t('비밀번호가 일치하지 않습니다', 'パスワードが一致しません'));
                                  return;
                                }
                                fetch(`/api/sales/upload-logs?id=${log.id}`, { method: 'DELETE' })
                                  .then(r => {
                                    if (r.ok) setUploadLogs(prev => prev.filter(l => l.id !== log.id));
                                    else alert(t('삭제 실패', '削除失敗'));
                                  })
                                  .catch(() => alert(t('삭제 실패', '削除失敗')));
                              }}
                              className="text-[10px] px-2 py-1 rounded-full cursor-pointer"
                              style={{ background: 'transparent', color: '#9ca3af', border: '1px solid rgba(156,163,175,0.3)' }}
                            >
                              {t('삭제', '削除')}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded detail */}
                      {expandedLogId === log.id && (
                        <tr key={`${log.id}-detail`}>
                          <td colSpan={6} className="px-4 py-3">
                            <div className="text-xs space-y-1 rounded-xl p-3" style={{ background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)' }}>
                              <div style={{ color: 'var(--color-text-secondary)' }}>
                                <span className="font-medium">{t('파일', 'ファイル')}:</span> {log.source_file ?? '-'}
                              </div>
                              <div style={{ color: 'var(--color-text-secondary)' }}>
                                <span className="font-medium">{t('업로드 일시', 'アップロード日時')}:</span> {new Date(log.created_at).toLocaleString(t('ko-KR', 'ja-JP'))}
                              </div>
                              <div style={{ color: 'var(--color-text-secondary)' }}>
                                <span className="font-medium">{t('행수', '行数')}:</span> {log.row_count.toLocaleString()}{t('행', '行')}
                              </div>
                              <div style={{ color: 'var(--color-text-secondary)' }}>
                                <span className="font-medium">{t('타입', 'タイプ')}:</span> {log.upload_type === 'weekly_report' ? 'Weekly Report' : t('속보치', '速報値')}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('업로드 이력이 없습니다', 'アップロード履歴がありません')}</p>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
