import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  ChevronRight,
} from 'lucide-react';
import {
  classifyFiles,
  getFilePreview,
  parseAllPlatforms,
} from '@/utils/platformParsers';
import type {
  ClassifiedFiles,
  ColumnMapping,
  FilePreview,
  ParseSummary,
} from '@/utils/platformParsers';
import { mergeDailySales, rebuildDataset } from '@/utils/dataConsolidator';
import { generateWeeklyReport } from '@/utils/reportGenerator';
import type { ConvertedData } from '@/utils/excelConverter';
import type { DailySale } from '@/types';
import { setUploadedData } from '@/hooks/useDataLoader';
import { uploadDatasetToSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAppState } from '@/hooks/useAppState';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Stage =
  | 'idle'
  | 'classifying'
  | 'mapping'
  | 'parsing'
  | 'preview'
  | 'merging'
  | 'done'
  | 'error';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RawDataUploader({
  open,
  onClose,
  existingData,
}: {
  open: boolean;
  onClose: () => void;
  existingData: { dailySales: DailySale[]; titleMaster: ConvertedData['titleMaster'] };
}) {
  const { language } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Classification
  const [classified, setClassified] = useState<ClassifiedFiles | null>(null);
  const [fileCount, setFileCount] = useState(0);

  // Mapping (for unknown files)
  const [mappings, setMappings] = useState<Map<File, ColumnMapping>>(new Map());
  const [previews, setPreviews] = useState<Map<File, FilePreview>>(new Map());
  const [currentMappingFile, setCurrentMappingFile] = useState<File | null>(null);

  // Parsing results
  const [parseSummary, setParseSummary] = useState<ParseSummary[]>([]);
  const [parsedSales, setParsedSales] = useState<DailySale[]>([]);
  const [totalNewSales, setTotalNewSales] = useState(0);

  // Final data
  const [mergedData, setMergedData] = useState<ConvertedData | null>(null);

  const reset = useCallback(() => {
    setStage('idle');
    setDragOver(false);
    setErrorMsg('');
    setClassified(null);
    setFileCount(0);
    setMappings(new Map());
    setPreviews(new Map());
    setCurrentMappingFile(null);
    setParseSummary([]);
    setParsedSales([]);
    setTotalNewSales(0);
    setMergedData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  /* ---------------------------------------------------------------- */
  /*  File processing                                                  */
  /* ---------------------------------------------------------------- */

  const processFiles = useCallback(async (files: File[]) => {
    setFileCount(files.length);
    setStage('classifying');

    try {
      const result = await classifyFiles(files);
      setClassified(result);

      if (result.unknown.length > 0) {
        // Load previews for unknown files
        const prevMap = new Map<File, FilePreview>();
        for (const f of result.unknown) {
          const preview = await getFilePreview(f);
          prevMap.set(f, preview);
        }
        setPreviews(prevMap);

        // Initialize default mappings
        const mapMap = new Map<File, ColumnMapping>();
        for (const f of result.unknown) {
          mapMap.set(f, {
            platform: '',
            titleColumn: 0,
            dateColumn: 1,
            salesColumn: 2,
            dateInHeaders: false,
            headerRowIndex: 0,
            encoding: 'utf-8',
          });
        }
        setMappings(mapMap);
        setCurrentMappingFile(result.unknown[0]);
        setStage('mapping');
      } else {
        await runParsing(result, new Map());
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStage('error');
    }
  }, []);

  const runParsing = useCallback(
    async (cls: ClassifiedFiles, maps: Map<File, ColumnMapping>) => {
      setStage('parsing');
      try {
        const { sales, summary } = await parseAllPlatforms(cls, maps);
        setParsedSales(sales);
        setParseSummary(summary);
        setTotalNewSales(sales.reduce((s, r) => s + r.sales, 0));
        setStage('preview');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setStage('error');
      }
    },
    [],
  );

  const handleMappingConfirm = useCallback(() => {
    // Validate all mappings have platform names
    for (const [file, mapping] of mappings) {
      if (!mapping.platform.trim()) {
        setErrorMsg(
          `${file.name}: ${language === 'ko' ? '플랫폼명을 입력해주세요' : 'プラットフォーム名を入力してください'}`,
        );
        setStage('error');
        return;
      }
    }
    if (classified) {
      runParsing(classified, mappings);
    }
  }, [classified, mappings, runParsing, language]);

  /* ---------------------------------------------------------------- */
  /*  Apply (merge + save)                                             */
  /* ---------------------------------------------------------------- */

  const handleApply = useCallback(async () => {
    setStage('merging');
    try {
      const merged = mergeDailySales(existingData.dailySales, parsedSales);
      const dataset = rebuildDataset(merged, existingData.titleMaster);
      setMergedData(dataset);

      // Apply to session
      setUploadedData(dataset);
      setStage('done');

      // Persist to Supabase in background
      if (isSupabaseConfigured) {
        const result = await uploadDatasetToSupabase(dataset, 'raw-upload');
        if (!result.success) {
          console.warn('Supabase upload failed:', result.error);
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStage('error');
    }
  }, [existingData, parsedSales]);

  /* ---------------------------------------------------------------- */
  /*  Download Weekly Report                                           */
  /* ---------------------------------------------------------------- */

  const handleDownloadReport = useCallback(() => {
    if (!mergedData) return;
    const blob = generateWeeklyReport(mergedData);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Weekly_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }, [mergedData]);

  /* ---------------------------------------------------------------- */
  /*  File input handlers                                              */
  /* ---------------------------------------------------------------- */

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) processFiles(files);
    },
    [processFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) processFiles(files);
    },
    [processFiles],
  );

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto overflow-hidden max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet size={20} className="text-primary" />
                  <h2 className="text-[15px] font-bold text-foreground">
                    {t(language, 'rawUpload.title')}
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors border-none bg-transparent cursor-pointer"
                >
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              {/* Body — scrollable */}
              <div className="px-6 py-5 overflow-y-auto flex-1">
                {/* Idle: Drop zone */}
                {stage === 'idle' && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'flex flex-col items-center justify-center gap-3 py-10 px-4',
                      'border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-200',
                      dragOver
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50',
                    )}
                  >
                    <Upload
                      size={36}
                      className={cn(
                        'transition-colors',
                        dragOver ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                    <p className="text-sm text-muted-foreground text-center">
                      {t(language, 'rawUpload.dragDrop')}
                    </p>
                    <span className="text-xs text-muted-foreground/70">
                      .csv, .xlsx, .xls
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Classifying */}
                {stage === 'classifying' && (
                  <LoadingState
                    message={`${t(language, 'rawUpload.classifying')} (${fileCount} ${language === 'ko' ? '개 파일' : 'ファイル'})`}
                  />
                )}

                {/* Mapping (unknown files) */}
                {stage === 'mapping' && classified && (
                  <MappingStage
                    classified={classified}
                    mappings={mappings}
                    previews={previews}
                    currentFile={currentMappingFile}
                    language={language}
                    onMappingChange={(file, mapping) => {
                      setMappings((prev) => {
                        const next = new Map(prev);
                        next.set(file, mapping);
                        return next;
                      });
                    }}
                    onFileSelect={setCurrentMappingFile}
                  />
                )}

                {/* Parsing */}
                {stage === 'parsing' && (
                  <LoadingState message={t(language, 'rawUpload.parsing')} />
                )}

                {/* Preview */}
                {stage === 'preview' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      {t(language, 'rawUpload.classified')}
                    </div>

                    {/* Per-platform summary */}
                    <div className="space-y-2">
                      {parseSummary.map((s) => (
                        <div
                          key={s.platform}
                          className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {platformLabel(s.platform, language)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {s.count} {language === 'ko' ? '작품' : '作品'}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {s.dateRange[0]} ~ {s.dateRange[1]}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="grid grid-cols-2 gap-3">
                      <SummaryItem
                        label={t(language, 'rawUpload.totalRows')}
                        value={parsedSales.length.toLocaleString()}
                      />
                      <SummaryItem
                        label={t(language, 'rawUpload.totalSales')}
                        value={`¥${totalNewSales.toLocaleString()}`}
                      />
                    </div>
                  </div>
                )}

                {/* Merging */}
                {stage === 'merging' && (
                  <LoadingState message={t(language, 'rawUpload.merging')} />
                )}

                {/* Done */}
                {stage === 'done' && (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <CheckCircle2 size={48} className="text-emerald-500" />
                    </motion.div>
                    <p className="text-sm font-medium text-foreground">
                      {t(language, 'rawUpload.success')}
                    </p>
                    <button
                      onClick={handleDownloadReport}
                      className={cn(
                        'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors',
                        'bg-primary text-white hover:bg-primary/90 border-none cursor-pointer',
                        'shadow-[0_2px_8px_rgba(37,99,235,0.25)]',
                      )}
                    >
                      <Download size={16} />
                      {t(language, 'rawUpload.downloadReport')}
                    </button>
                  </div>
                )}

                {/* Error */}
                {stage === 'error' && (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <AlertCircle size={40} className="text-red-500" />
                    <p className="text-sm font-medium text-red-600">
                      {t(language, 'upload.error')}
                    </p>
                    <p className="text-xs text-muted-foreground text-center max-w-[400px]">
                      {errorMsg}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {(stage === 'preview' || stage === 'error' || stage === 'mapping') && (
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 shrink-0">
                  {stage === 'error' && (
                    <button
                      onClick={reset}
                      className={cn(
                        'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                        'border border-border bg-transparent hover:bg-muted cursor-pointer text-foreground',
                      )}
                    >
                      {t(language, 'upload.retry')}
                    </button>
                  )}
                  {stage === 'mapping' && (
                    <>
                      <button
                        onClick={reset}
                        className={cn(
                          'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                          'border border-border bg-transparent hover:bg-muted cursor-pointer text-foreground',
                        )}
                      >
                        {t(language, 'upload.cancel')}
                      </button>
                      <button
                        onClick={handleMappingConfirm}
                        className={cn(
                          'flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors',
                          'bg-primary text-white hover:bg-primary/90 border-none cursor-pointer',
                        )}
                      >
                        {language === 'ko' ? '다음' : '次へ'}
                        <ChevronRight size={14} />
                      </button>
                    </>
                  )}
                  {stage === 'preview' && (
                    <>
                      <button
                        onClick={reset}
                        className={cn(
                          'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                          'border border-border bg-transparent hover:bg-muted cursor-pointer text-foreground',
                        )}
                      >
                        {t(language, 'upload.cancel')}
                      </button>
                      <button
                        onClick={handleApply}
                        className={cn(
                          'px-4 py-2 text-sm font-semibold rounded-lg transition-colors',
                          'bg-primary text-white hover:bg-primary/90 border-none cursor-pointer',
                        )}
                      >
                        {t(language, 'rawUpload.apply')}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Close button for done stage */}
              {stage === 'done' && (
                <div className="flex justify-center px-6 py-4 border-t border-border/60 shrink-0">
                  <button
                    onClick={handleClose}
                    className={cn(
                      'px-6 py-2 text-sm font-medium rounded-lg transition-colors',
                      'border border-border bg-transparent hover:bg-muted cursor-pointer text-foreground',
                    )}
                  >
                    {language === 'ko' ? '닫기' : '閉じる'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10">
      <Loader2 size={32} className="text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground font-medium mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}

function platformLabel(platform: string, language: string): string {
  const labels: Record<string, Record<string, string>> = {
    mechacomic: { ko: '메챠코믹', ja: 'メチャコミック' },
    cmoa: { ko: '코믹시모아', ja: 'コミックシーモア' },
    piccoma: { ko: '픽코마', ja: 'ピッコマ' },
  };
  return labels[platform]?.[language] ?? platform;
}

/* ------------------------------------------------------------------ */
/*  Mapping stage component                                            */
/* ------------------------------------------------------------------ */

function MappingStage({
  classified,
  mappings,
  previews,
  currentFile,
  language,
  onMappingChange,
  onFileSelect,
}: {
  classified: ClassifiedFiles;
  mappings: Map<File, ColumnMapping>;
  previews: Map<File, FilePreview>;
  currentFile: File | null;
  language: string;
  onMappingChange: (file: File, mapping: ColumnMapping) => void;
  onFileSelect: (file: File) => void;
}) {
  const la = language as 'ko' | 'ja';

  return (
    <div className="space-y-4">
      {/* Detected platforms summary */}
      <div className="space-y-1.5">
        {classified.mechacomic.length > 0 && (
          <FileGroupLabel
            icon="✅"
            label={`${platformLabel('mechacomic', language)}: ${classified.mechacomic.length} ${la === 'ko' ? '개' : '件'}`}
          />
        )}
        {classified.cmoa.length > 0 && (
          <FileGroupLabel
            icon="✅"
            label={`${platformLabel('cmoa', language)}: ${classified.cmoa.length} ${la === 'ko' ? '개' : '件'}`}
          />
        )}
        {classified.piccoma.length > 0 && (
          <FileGroupLabel
            icon="✅"
            label={`${platformLabel('piccoma', language)}: ${classified.piccoma.length} ${la === 'ko' ? '개' : '件'}`}
          />
        )}
        <FileGroupLabel
          icon="⚠️"
          label={`${t(la, 'rawUpload.unknownFiles')}: ${classified.unknown.length} ${la === 'ko' ? '개' : '件'}`}
        />
      </div>

      {/* File tabs for unknown files */}
      {classified.unknown.length > 1 && (
        <div className="flex gap-1 overflow-x-auto">
          {classified.unknown.map((f) => (
            <button
              key={f.name}
              onClick={() => onFileSelect(f)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap border-none cursor-pointer',
                currentFile === f
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {f.name}
            </button>
          ))}
        </div>
      )}

      {/* Current file mapping UI */}
      {currentFile && (
        <MappingForm
          file={currentFile}
          mapping={mappings.get(currentFile)!}
          preview={previews.get(currentFile)!}
          language={la}
          onChange={(mapping) => onMappingChange(currentFile, mapping)}
        />
      )}
    </div>
  );
}

function FileGroupLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-foreground">
      <span>{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

function MappingForm({
  file,
  mapping,
  preview,
  language,
  onChange,
}: {
  file: File;
  mapping: ColumnMapping;
  preview: FilePreview;
  language: 'ko' | 'ja';
  onChange: (mapping: ColumnMapping) => void;
}) {
  const update = (patch: Partial<ColumnMapping>) => {
    onChange({ ...mapping, ...patch });
  };

  return (
    <div className="space-y-3 bg-muted/30 rounded-xl p-4 border border-border/50">
      <p className="text-xs font-semibold text-muted-foreground">{file.name}</p>

      {/* Preview table */}
      <div className="overflow-x-auto max-h-[140px] rounded-lg border border-border bg-card">
        <table className="text-[11px] w-full">
          <thead>
            <tr className="bg-muted">
              {preview.headers.map((h, i) => (
                <th
                  key={i}
                  className="px-2 py-1.5 text-left font-semibold text-muted-foreground whitespace-nowrap"
                >
                  [{i}] {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-muted/30'}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="px-2 py-1 text-foreground whitespace-nowrap max-w-[150px] truncate"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mapping controls */}
      <div className="grid grid-cols-2 gap-3">
        <MappingField label={language === 'ko' ? '플랫폼명' : 'PF名'}>
          <input
            type="text"
            value={mapping.platform}
            onChange={(e) => update({ platform: e.target.value })}
            placeholder="DMM, LDF, ..."
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
          />
        </MappingField>

        <MappingField label={language === 'ko' ? '작품명 컬럼' : '作品名カラム'}>
          <select
            value={mapping.titleColumn}
            onChange={(e) => update({ titleColumn: Number(e.target.value) })}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
          >
            {preview.headers.map((h, i) => (
              <option key={i} value={i}>
                [{i}] {h}
              </option>
            ))}
          </select>
        </MappingField>

        <MappingField label={language === 'ko' ? '매출 컬럼' : '売上カラム'}>
          <select
            value={mapping.salesColumn}
            onChange={(e) => update({ salesColumn: Number(e.target.value) })}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
          >
            {preview.headers.map((h, i) => (
              <option key={i} value={i}>
                [{i}] {h}
              </option>
            ))}
          </select>
        </MappingField>

        <MappingField label={language === 'ko' ? '인코딩' : 'エンコーディング'}>
          <select
            value={mapping.encoding}
            onChange={(e) =>
              update({ encoding: e.target.value as 'utf-8' | 'shift-jis' })
            }
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
          >
            <option value="utf-8">UTF-8</option>
            <option value="shift-jis">Shift-JIS</option>
          </select>
        </MappingField>
      </div>

      {/* Date mode */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={mapping.dateInHeaders}
            onChange={(e) =>
              update({
                dateInHeaders: e.target.checked,
                dateColumn: e.target.checked ? null : 1,
              })
            }
            className="rounded"
          />
          {language === 'ko'
            ? '날짜가 컬럼 헤더에 있음 (피벗 형태)'
            : '日付がカラムヘッダーにある（ピボット形式）'}
        </label>

        {!mapping.dateInHeaders && (
          <MappingField label={language === 'ko' ? '날짜 컬럼' : '日付カラム'}>
            <select
              value={mapping.dateColumn ?? 0}
              onChange={(e) => update({ dateColumn: Number(e.target.value) })}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground"
            >
              {preview.headers.map((h, i) => (
                <option key={i} value={i}>
                  [{i}] {h}
                </option>
              ))}
            </select>
          </MappingField>
        )}
      </div>
    </div>
  );
}

function MappingField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
