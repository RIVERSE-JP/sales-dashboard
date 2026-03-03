import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { readExcelFile, getPreview, convertExcel } from '@/utils/excelConverter';
import type { PreviewInfo, ConvertedData } from '@/utils/excelConverter';
import { setUploadedData, clearUploadedData, hasUploadedData } from '@/hooks/useDataLoader';
import { uploadDatasetToSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAppState } from '@/hooks/useAppState';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Stage = 'idle' | 'parsing' | 'preview' | 'converting' | 'done' | 'error';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DataUploader({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { language } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>('idle');
  const [preview, setPreview] = useState<PreviewInfo | null>(null);
  const [convertedData, setConvertedData] = useState<ConvertedData | null>(null);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const reset = useCallback(() => {
    setStage('idle');
    setPreview(null);
    setConvertedData(null);
    setFileName('');
    setErrorMsg('');
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.xlsx?$/i)) {
      setErrorMsg(t(language, 'upload.invalidFormat'));
      setStage('error');
      return;
    }

    setFileName(file.name);
    setStage('parsing');

    try {
      const workbook = await readExcelFile(file);
      const info = getPreview(workbook);
      setPreview(info);

      setStage('converting');
      // Use requestAnimationFrame to let the UI update before heavy computation
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          try {
            const data = convertExcel(workbook);
            setConvertedData(data);
            setStage('preview');
            resolve();
          } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : String(err));
            setStage('error');
            resolve();
          }
        });
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStage('error');
    }
  }, [language]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleApply = useCallback(async () => {
    if (!convertedData) return;

    // 1. Immediately apply to local session (fast)
    setUploadedData(convertedData);
    setStage('done');

    // 2. Persist to Supabase in background (non-blocking)
    if (isSupabaseConfigured) {
      const result = await uploadDatasetToSupabase(convertedData, fileName);
      if (!result.success) {
        console.warn('Supabase upload failed:', result.error);
      }
    }

    setTimeout(() => handleClose(), 1200);
  }, [convertedData, fileName, handleClose]);

  const handleRevert = useCallback(() => {
    clearUploadedData();
    handleClose();
  }, [handleClose]);

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
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet size={20} className="text-primary" />
                  <h2 className="text-[15px] font-bold text-foreground">
                    {t(language, 'upload.title')}
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors border-none bg-transparent cursor-pointer"
                >
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                {/* Idle: Drop zone */}
                {stage === 'idle' && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
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
                    <Upload size={36} className={cn('transition-colors', dragOver ? 'text-primary' : 'text-muted-foreground')} />
                    <p className="text-sm text-muted-foreground text-center">
                      {t(language, 'upload.dragDrop')}
                    </p>
                    <span className="text-xs text-muted-foreground/70">
                      .xlsx, .xls
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Parsing / Converting */}
                {(stage === 'parsing' || stage === 'converting') && (
                  <div className="flex flex-col items-center gap-4 py-10">
                    <Loader2 size={32} className="text-primary animate-spin" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">{fileName}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stage === 'parsing'
                          ? t(language, 'upload.parsing')
                          : t(language, 'upload.converting')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Preview */}
                {stage === 'preview' && preview && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      {fileName}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <PreviewItem
                        label={t(language, 'upload.rows')}
                        value={preview.totalRows.toLocaleString()}
                      />
                      <PreviewItem
                        label={t(language, 'upload.dateRange')}
                        value={preview.dateRange.start && preview.dateRange.end
                          ? `${preview.dateRange.start} ~ ${preview.dateRange.end}`
                          : '-'}
                      />
                      <PreviewItem
                        label={t(language, 'upload.platforms')}
                        value={preview.platforms.join(', ') || '-'}
                      />
                      <PreviewItem
                        label={t(language, 'upload.titleCount')}
                        value={String(preview.titleCount)}
                      />
                    </div>

                    {!preview.hasTitleSheet && (
                      <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                        {t(language, 'upload.noTitleSheet')}
                      </p>
                    )}
                  </div>
                )}

                {/* Done */}
                {stage === 'done' && (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <CheckCircle2 size={48} className="text-emerald-500" />
                    </motion.div>
                    <p className="text-sm font-medium text-foreground">
                      {t(language, 'upload.success')}
                    </p>
                  </div>
                )}

                {/* Error */}
                {stage === 'error' && (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <AlertCircle size={40} className="text-red-500" />
                    <p className="text-sm font-medium text-red-600">
                      {t(language, 'upload.error')}
                    </p>
                    <p className="text-xs text-muted-foreground text-center max-w-[320px]">
                      {errorMsg}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {(stage === 'preview' || stage === 'error') && (
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60">
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
                        {t(language, 'upload.apply')}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Revert button when uploaded data is active */}
              {stage === 'idle' && hasUploadedData() && (
                <div className="px-6 py-4 border-t border-border/60">
                  <button
                    onClick={handleRevert}
                    className={cn(
                      'flex items-center gap-2 w-full justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                      'border border-amber-200 bg-amber-50 hover:bg-amber-100 cursor-pointer text-amber-700',
                    )}
                  >
                    <RotateCcw size={14} />
                    {t(language, 'upload.revert')}
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
/*  Preview item                                                       */
/* ------------------------------------------------------------------ */

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground font-medium mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}
