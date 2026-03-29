'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { toastVariants } from '@/lib/animations';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

const typeConfig: Record<ToastType, { icon: typeof CheckCircle; color: string; bg: string; border: string }> = {
  success: {
    icon: CheckCircle,
    color: 'var(--color-status-good)',
    bg: 'var(--color-status-good-bg)',
    border: 'var(--color-status-good-border)',
  },
  error: {
    icon: XCircle,
    color: 'var(--color-status-danger)',
    bg: 'var(--color-status-danger-bg)',
    border: 'var(--color-status-danger-border)',
  },
  info: {
    icon: Info,
    color: 'var(--color-accent-blue)',
    bg: 'rgba(59, 111, 246, 0.08)',
    border: 'rgba(59, 111, 246, 0.2)',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const config = typeConfig[toast.type];
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      layout
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        borderRadius: 12,
        background: config.bg,
        border: `1px solid ${config.border}`,
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.16)',
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--color-text-primary)',
        pointerEvents: 'auto',
        minWidth: 240,
        maxWidth: 380,
      }}
    >
      <Icon size={18} style={{ color: config.color, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          padding: 2,
          display: 'flex',
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}
