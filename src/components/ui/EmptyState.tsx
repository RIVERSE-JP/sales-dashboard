'use client';
import { motion } from 'framer-motion';
import { type LucideIcon, FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon: Icon = FileQuestion,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <motion.div
        animate={{
          y: [0, -6, 0],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ marginBottom: 16 }}
      >
        <Icon
          size={48}
          style={{
            color: 'var(--color-text-subtle)',
            strokeWidth: 1.5,
          }}
        />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        style={{
          fontSize: 15,
          color: 'var(--color-text-muted)',
          margin: 0,
          maxWidth: 320,
          lineHeight: 1.5,
        }}
      >
        {message}
      </motion.p>

      {actionLabel && onAction && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={onAction}
          style={{
            marginTop: 20,
            padding: '8px 20px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            background: 'var(--color-accent-blue)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(59, 111, 246, 0.3)',
          }}
        >
          {actionLabel}
        </motion.button>
      )}
    </div>
  );
}
