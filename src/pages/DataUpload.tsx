import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Trash2, Clock } from 'lucide-react';
import { supabase, upsertDailySales } from '@/lib/supabase';
import type { UploadLog } from '@/types';
import ExcelJS from 'exceljs';

// ============================================================
// Shared styles & animation variants
// ============================================================

const GLASS_CARD = {
  background: 'rgba(255, 255, 255, 0.03)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  borderRadius: '16px',
} as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

// ============================================================
// Types
// ============================================================

interface ParsedRow {
  title_jp: string;
  title_kr: string;
  channel_title_jp: string;
  channel: string;
  sale_date: string;
  sales_amount: number;
}

type UploadStatus = 'idle' | 'parsing' | 'preview' | 'uploading' | 'success' | 'error';

interface UploadResult {
  inserted: number;
  updated: number;
}

// ============================================================
// Excel Parsing
// ============================================================

async function parseWeeklyReport(buffer: ArrayBuffer): Promise<ParsedRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  // Try to find Daily_raw sheet
  const dailySheet = wb.worksheets.find((ws) =>
    ws.name.toLowerCase().includes('daily_raw') || ws.name.toLowerCase().includes('daily')
  ) ?? wb.worksheets[0];

  if (!dailySheet) return [];

  const rows: ParsedRow[] = [];
  let headerRow = -1;

  // Find header row (contains "Title" or "Channel" or "Date")
  dailySheet.eachRow((row, rowNumber) => {
    if (headerRow > 0) return;
    const vals = row.values as (string | null | undefined)[];
    if (vals.some((v) => typeof v === 'string' && (v.includes('Title') || v.includes('Channel') || v.includes('Date')))) {
      headerRow = rowNumber;
    }
  });

  if (headerRow < 0) headerRow = 2; // default: header at row 2

  // Parse data rows after header
  dailySheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return;
    const vals = row.values as (string | number | Date | null | undefined)[];
    // Expected columns: Title(JP), Title(KR), Channel Title(JP), Channel, Date, Sales
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
      // Try parse yyyy/MM/dd or yyyy-MM-dd
      const cleaned = rawDate.replace(/\//g, '-');
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(cleaned)) {
        const parts = cleaned.split('-');
        saleDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    } else if (typeof rawDate === 'number') {
      // Excel serial date
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
      const cleaned = rawDate.replace(/\//g, '-');
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(cleaned)) {
        const parts = cleaned.split('-');
        saleDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
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

export function DataUpload() {
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

  // Load upload history
  useEffect(() => {
    supabase
      .from('upload_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setUploadLogs(data as UploadLog[]);
      });
  }, [status]); // reload after successful upload

  const detectFileType = (name: string): 'weekly_report' | 'sokuhochi' => {
    const lower = name.toLowerCase();
    if (lower.includes('sokuhochi') || lower.includes('速報')) return 'sokuhochi';
    return 'weekly_report';
  };

  const handleFile = useCallback(async (file: File) => {
    setStatus('parsing');
    setFileName(file.name);
    setErrorMessage('');
    setUploadResult(null);

    const detectedType = detectFileType(file.name);
    setFileType(detectedType);

    try {
      const buffer = await file.arrayBuffer();
      const rows = detectedType === 'sokuhochi'
        ? await parseSokuhochi(buffer)
        : await parseWeeklyReport(buffer);

      if (rows.length === 0) {
        setStatus('error');
        setErrorMessage('データが見つかりませんでした。ファイル形式を確認してください。');
        return;
      }

      setParsedRows(rows);
      setStatus('preview');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'ファイルの解析に失敗しました');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleFile(file);
    } else {
      setErrorMessage('.xlsx ファイルのみ対応しています');
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleUpload = async () => {
    setStatus('uploading');
    setUploadProgress(0);

    try {
      const batchSize = 500;
      let totalInserted = 0;
      let totalUpdated = 0;

      for (let i = 0; i < parsedRows.length; i += batchSize) {
        const batch = parsedRows.slice(i, i + batchSize);
        const result = await upsertDailySales(batch, fileType, false);
        totalInserted += result.inserted;
        totalUpdated += result.updated;
        setUploadProgress(Math.round(((i + batchSize) / parsedRows.length) * 100));
      }

      setUploadResult({ inserted: totalInserted, updated: totalUpdated });
      setStatus('success');

      // Log the upload
      await supabase.from('upload_logs').insert({
        upload_type: fileType,
        source_file: fileName,
        row_count: parsedRows.length,
        status: 'success',
      });
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'アップロードに失敗しました');
    }
  };

  const reset = () => {
    setStatus('idle');
    setParsedRows([]);
    setFileName('');
    setUploadResult(null);
    setErrorMessage('');
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center page-icon-glow"
        >
          <Upload size={20} color="white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#f0f0f5' }}>Data Upload</h1>
          <p className="text-sm" style={{ color: '#55556a' }}>Excelファイルからデータをアップロード</p>
        </div>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
        {/* Drop zone / Status area */}
        <motion.div variants={cardVariants}>
          <AnimatePresence mode="wait">
            {status === 'idle' && (
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
                  border: dragOver
                    ? '2px dashed rgba(129, 140, 248, 0.6)'
                    : '2px dashed rgba(255, 255, 255, 0.1)',
                  background: dragOver
                    ? 'rgba(99, 102, 241, 0.06)'
                    : 'rgba(255, 255, 255, 0.03)',
                  minHeight: 240,
                }}
              >
                <motion.div
                  animate={{ y: dragOver ? -8 : 0 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
                  }}
                >
                  <FileSpreadsheet size={32} color="#818cf8" />
                </motion.div>
                <p className="text-sm font-semibold mb-1" style={{ color: '#f0f0f5' }}>
                  Excelファイルをドラッグ＆ドロップ
                </p>
                <p className="text-xs" style={{ color: '#55556a' }}>
                  Weekly Report (.xlsx) / 速報値 (.xlsx) に対応
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </motion.div>
            )}

            {status === 'parsing' && (
              <motion.div
                key="parsing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl p-12 flex flex-col items-center justify-center"
                style={{ ...GLASS_CARD, minHeight: 240 }}
              >
                <Loader2 size={40} color="#818cf8" className="animate-spin mb-4" />
                <p className="text-sm font-semibold" style={{ color: '#f0f0f5' }}>解析中...</p>
                <p className="text-xs mt-1" style={{ color: '#55556a' }}>{fileName}</p>
              </motion.div>
            )}

            {status === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl p-6"
                style={GLASS_CARD}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: '#f0f0f5' }}>プレビュー</h2>
                    <p className="text-xs mt-0.5" style={{ color: '#55556a' }}>
                      {fileName} | {parsedRows.length.toLocaleString()} 行 |
                      タイプ: {fileType === 'weekly_report' ? 'Weekly Report' : '速報値'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={reset}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.04)', color: '#8888a0', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <Trash2 size={14} />
                      キャンセル
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={handleUpload}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer btn-gradient"
                      style={{
                      }}
                    >
                      <Upload size={14} />
                      アップロード ({parsedRows.length}行)
                    </motion.button>
                  </div>
                </div>

                {/* Preview table */}
                <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <table className="w-full text-xs min-w-[600px]">
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <th className="py-2.5 px-3 text-left font-medium" style={{ color: '#8888a0' }}>#</th>
                        <th className="py-2.5 px-3 text-left font-medium" style={{ color: '#8888a0' }}>Title(JP)</th>
                        <th className="py-2.5 px-3 text-left font-medium" style={{ color: '#8888a0' }}>Channel</th>
                        <th className="py-2.5 px-3 text-left font-medium" style={{ color: '#8888a0' }}>Date</th>
                        <th className="py-2.5 px-3 text-right font-medium" style={{ color: '#8888a0' }}>Sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 10).map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td className="py-2.5 px-3" style={{ color: '#55556a' }}>{idx + 1}</td>
                          <td className="py-2.5 px-3 truncate max-w-[200px]" style={{ color: '#f0f0f5' }}>{row.title_jp}</td>
                          <td className="py-2.5 px-3" style={{ color: '#8888a0' }}>{row.channel}</td>
                          <td className="py-2.5 px-3 font-mono" style={{ color: '#8888a0' }}>{row.sale_date}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold" style={{ color: '#f0f0f5' }}>
                            ¥{row.sales_amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRows.length > 10 && (
                    <div className="py-2 text-center text-xs" style={{ color: '#55556a', background: 'rgba(255,255,255,0.02)' }}>
                      ... 他 {(parsedRows.length - 10).toLocaleString()} 行
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {status === 'uploading' && (
              <motion.div
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl p-12 flex flex-col items-center justify-center"
                style={{ ...GLASS_CARD, minHeight: 240 }}
              >
                <Loader2 size={40} color="#818cf8" className="animate-spin mb-4" />
                <p className="text-sm font-semibold mb-2" style={{ color: '#f0f0f5' }}>アップロード中...</p>
                <div className="w-48 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #6366f1, #818cf8)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs mt-2" style={{ color: '#55556a' }}>{uploadProgress}%</p>
              </motion.div>
            )}

            {status === 'success' && uploadResult && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl p-12 flex flex-col items-center justify-center"
                style={{ ...GLASS_CARD, minHeight: 240 }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                >
                  <CheckCircle size={48} color="#22c55e" />
                </motion.div>
                <p className="text-lg font-bold mt-4 mb-2" style={{ color: '#f0f0f5' }}>アップロード完了</p>
                <div className="flex gap-6 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{uploadResult.inserted}</p>
                    <p className="text-xs" style={{ color: '#8888a0' }}>新規追加</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold" style={{ color: '#818cf8' }}>{uploadResult.updated}</p>
                    <p className="text-xs" style={{ color: '#8888a0' }}>更新</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={reset}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: '#f0f0f5',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  新規アップロード
                </motion.button>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl p-12 flex flex-col items-center justify-center"
                style={{ ...GLASS_CARD, minHeight: 240 }}
              >
                <AlertCircle size={48} color="#ef4444" />
                <p className="text-lg font-bold mt-4 mb-2" style={{ color: '#f0f0f5' }}>エラー</p>
                <p className="text-sm text-center max-w-md" style={{ color: '#8888a0' }}>{errorMessage}</p>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={reset}
                  className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: '#f0f0f5',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  やり直す
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Upload history */}
        <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} color="#8888a0" />
            <h2 className="text-lg font-semibold" style={{ color: '#f0f0f5' }}>アップロード履歴</h2>
          </div>

          {uploadLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th className="py-2.5 px-2 text-left font-medium" style={{ color: '#8888a0' }}>日時</th>
                    <th className="py-2.5 px-2 text-left font-medium" style={{ color: '#8888a0' }}>タイプ</th>
                    <th className="py-2.5 px-2 text-left font-medium" style={{ color: '#8888a0' }}>ファイル</th>
                    <th className="py-2.5 px-2 text-right font-medium" style={{ color: '#8888a0' }}>行数</th>
                    <th className="py-2.5 px-2 text-center font-medium" style={{ color: '#8888a0' }}>ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="py-2.5 px-2 font-mono text-xs" style={{ color: '#8888a0' }}>
                        {new Date(log.created_at).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: log.upload_type === 'sokuhochi' ? 'rgba(251,191,36,0.15)' : 'rgba(99,102,241,0.15)',
                            color: log.upload_type === 'sokuhochi' ? '#fbbf24' : '#818cf8',
                          }}
                        >
                          {log.upload_type === 'weekly_report' ? 'WR' : '速報'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-xs truncate max-w-[200px]" style={{ color: '#f0f0f5' }}>
                        {log.source_file ?? '-'}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-xs" style={{ color: '#f0f0f5' }}>
                        {log.row_count.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: log.status === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                            color: log.status === 'success' ? '#22c55e' : '#ef4444',
                          }}
                        >
                          {log.status === 'success' ? '成功' : 'エラー'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-6 text-sm" style={{ color: '#55556a' }}>
              アップロード履歴がありません
            </p>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
