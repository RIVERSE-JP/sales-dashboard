'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { tabContent } from '@/lib/animations';

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabNavProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
}

export default function TabNav({ tabs, defaultTab, onChange }: TabNavProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '');

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    onChange?.(id);
  };

  const activeContent = tabs.find((t) => t.id === activeTab)?.content;

  return (
    <div>
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          padding: 4,
          background: 'var(--glass-card-premium)',
          border: '1px solid var(--glass-card-premium-border)',
          borderRadius: 12,
          backdropFilter: 'blur(12px)',
          marginBottom: 20,
          position: 'relative',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              position: 'relative',
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 600 : 500,
              color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 8,
              zIndex: 1,
              transition: 'color 0.2s',
            }}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-indicator"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'var(--color-accent-blue)',
                  borderRadius: 8,
                  opacity: 0.12,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-bar"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '20%',
                  right: '20%',
                  height: 2,
                  background: 'var(--color-accent-blue)',
                  borderRadius: 1,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1 }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={tabContent}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {activeContent}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
