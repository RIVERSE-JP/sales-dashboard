'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  Globe,

  Database,
  Upload,
  FileText,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { SWRConfig } from 'swr';
import { AppProvider, useApp } from '@/context/AppContext';
import { clearAllCache } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Navigation config – grouped by executive thinking flow
// ---------------------------------------------------------------------------
interface NavItem {
  to: string;
  ko: string;
  ja: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: { ko: string; ja: string };
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: { ko: '분석', ja: '分析' },
    items: [
      { to: '/dashboard', ko: '매출 현황', ja: '売上現況', icon: LayoutDashboard },
      { to: '/titles', ko: '작품별 매출 분석', ja: 'タイトル別売上分析', icon: BookOpen },
      { to: '/platforms', ko: '플랫폼별 매출 분석', ja: 'プラットフォーム別売上分析', icon: Globe },
    ],
  },
  {
    label: { ko: '운영', ja: '運営' },
    items: [
      { to: '/upload', ko: '속보치 업로드', ja: '速報アップロード', icon: Upload },
      { to: '/reports', ko: '리포트 다운로드', ja: 'レポートDL', icon: FileText },
      { to: '/data', ko: '데이터베이스 관리', ja: 'データベース管理', icon: Database },
    ],
  },
];

// Flat list for breadcrumb lookup
const allNavItems = navGroups.flatMap((g) => g.items);

// Mobile bottom nav (5 items)
const mobileNavItems: NavItem[] = [
  { to: '/dashboard', ko: '매출현황', ja: '売上', icon: LayoutDashboard },
  { to: '/titles', ko: '작품', ja: 'タイトル', icon: BookOpen },
  { to: '/platforms', ko: '플랫폼', ja: 'PF', icon: Globe },
  { to: '/data', ko: '데이터', ja: 'データ', icon: Database },
  { to: '/upload', ko: '업로드', ja: 'UP', icon: Upload },
];

// Period presets
// periodPresets removed — each page has its own date selector

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// useCurrentTime removed — header clock removed

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-1"
      style={{
        background: active ? '#1A2B5E' : 'transparent',
        color: active ? '#ffffff' : 'var(--color-text-secondary)',
        borderRadius: '6px',
        border: 'none',
      }}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Inner Layout (needs useApp context)
// ---------------------------------------------------------------------------
function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lang, setLang, currency, setCurrency, theme, setTheme, t } = useApp();

  const sidebarWidth = collapsed ? 72 : 260;
  const isLight = theme === 'light';

  return (
    <div
      className={`flex h-screen overflow-hidden ${isLight ? 'theme-light' : ''}`}
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      {/* ---- Mobile overlay ---- */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ---- Sidebar ---- */}
      <motion.aside
        className={`
          fixed md:relative z-50 h-full flex flex-col
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          transition-transform duration-300 md:transition-none
        `}
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: 'var(--color-sidebar-bg)',
          borderRight: '1px solid var(--color-glass-border)',
        }}
      >
        {/* Logo area */}
        <div
          className="flex items-center h-16 px-4 shrink-0 cursor-pointer select-none"
          role="button"
          tabIndex={0}
          title={t('홈으로 (데이터 새로고침)', 'ホームへ (データ更新)')}
          onClick={() => {
            clearAllCache();
            router.push('/dashboard');
            setMobileOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              clearAllCache();
              router.push('/dashboard');
              setMobileOpen(false);
            }
          }}
          style={{ transition: 'opacity 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          <img
            src="/riverse_logo.png"
            alt="RIVERSE"
            className="shrink-0"
            style={{ height: collapsed ? 26 : 30, width: 'auto', objectFit: 'contain' }}
          />
          {!collapsed && (
            <span
              className="ml-2 text-sm font-bold whitespace-nowrap"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('매출 현황 보드', '売上現況ボード')}
            </span>
          )}

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto md:hidden p-1.5 rounded-lg hover:bg-[var(--color-glass-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            style={{
              color: 'var(--color-text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Divider */}
        <div
          className="mx-4 mb-2"
          style={{
            borderBottom: '1px solid var(--color-glass-border)',
          }}
        />

        {/* Nav links – grouped */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {/* Group label */}
              {!collapsed && (
                <div
                  className="text-[11px] tracking-wider uppercase font-semibold px-3 pt-3 pb-1.5 select-none"
                  style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}
                >
                  {lang === 'ko' ? group.label.ko : group.label.ja}
                </div>
              )}

              {/* Group divider (except first group) */}
              {gi > 0 && collapsed && (
                <div
                  className="mx-3 my-2"
                  style={{ borderBottom: '1px solid rgba(128,128,128,0.06)' }}
                />
              )}
              {gi > 0 && !collapsed && (
                <div
                  className="mx-3 mb-1"
                  style={{ borderBottom: '1px solid rgba(128,128,128,0.06)' }}
                />
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      href={item.to}
                      onClick={(e) => {
                        setMobileOpen(false);
                        // 같은 페이지면 강제 리셋 (상세→목록으로 돌아감)
                        if (pathname.startsWith(item.to)) {
                          e.preventDefault();
                          router.push(item.to);
                          router.refresh();
                        }
                      }}
                      className="group relative flex items-center rounded-xl transition-all duration-200"
                      style={{
                        padding: collapsed ? '10px 0' : '10px 12px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        color: isActive ? 'var(--color-sidebar-active-text)' : 'var(--color-text-secondary)',
                        background: isActive ? 'var(--color-sidebar-active)' : 'transparent',
                        textDecoration: 'none',
                      }}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <motion.div
                          layoutId="nav-active"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full"
                          style={{
                            height: '60%',
                            background: 'var(--color-accent-blue, #3b82f6)',
                            boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)',
                          }}
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}

                      {/* Hover accent bar (slides in from left) */}
                      {!isActive && (
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-1 group-hover:translate-x-0"
                          style={{
                            height: '40%',
                            background: 'var(--color-accent-blue, #3b82f6)',
                          }}
                        />
                      )}

                      <div
                        className="shrink-0 transition-colors duration-200"
                        style={{ color: isActive ? 'var(--color-sidebar-active-text)' : undefined }}
                      >
                        <item.icon size={20} />
                      </div>

                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            transition={{ duration: 0.15 }}
                            className="ml-3 text-sm font-medium whitespace-nowrap"
                          >
                            {lang === 'ko' ? item.ko : item.ja}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {/* Hover glow */}
                      <div
                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                        style={{
                          background: isActive
                            ? 'transparent'
                            : isLight
                              ? 'rgba(26, 43, 94, 0.06)'
                              : 'rgba(255, 255, 255, 0.03)',
                        }}
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Theme, Language, Currency toggles */}
        {!collapsed && (
          <div
            className="px-4 py-3 space-y-2.5"
            style={{
              borderTop: '1px solid var(--color-glass-border)',
            }}
          >
            {/* Theme toggle */}
            <div className="flex items-center justify-between">
              <span
                className="text-[12px] font-medium tracking-wider"
                style={{ color: 'var(--color-text-muted)' }}
              >
                THEME
              </span>
              <div
                className="flex rounded-lg overflow-hidden"
                style={{
                  border: '1px solid var(--color-glass-border)',
                }}
              >
                <ToggleButton active={theme === 'dark'} onClick={() => setTheme('dark')}>
                  Dark
                </ToggleButton>
                <ToggleButton active={theme === 'light'} onClick={() => setTheme('light')}>
                  Light
                </ToggleButton>
              </div>
            </div>

            {/* Lang toggle */}
            <div className="flex items-center justify-between">
              <span
                className="text-[12px] font-medium tracking-wider"
                style={{ color: 'var(--color-text-muted)' }}
              >
                LANG
              </span>
              <div
                className="flex rounded-lg overflow-hidden"
                style={{
                  border: '1px solid var(--color-glass-border)',
                }}
              >
                <ToggleButton active={lang === 'ko'} onClick={() => setLang('ko')}>
                  KO
                </ToggleButton>
                <ToggleButton active={lang === 'ja'} onClick={() => setLang('ja')}>
                  JA
                </ToggleButton>
              </div>
            </div>

            {/* Currency toggle */}
            <div className="flex items-center justify-between">
              <span
                className="text-[12px] font-medium tracking-wider"
                style={{ color: 'var(--color-text-muted)' }}
              >
                CURRENCY
              </span>
              <div
                className="flex rounded-lg overflow-hidden"
                style={{
                  border: '1px solid var(--color-glass-border)',
                }}
              >
                <ToggleButton active={currency === 'JPY'} onClick={() => setCurrency('JPY')}>
                  JPY
                </ToggleButton>
                <ToggleButton active={currency === 'KRW'} onClick={() => setCurrency('KRW')}>
                  KRW
                </ToggleButton>
              </div>
            </div>
          </div>
        )}

        {/* Collapse toggle (desktop only) */}
        <div className="hidden md:flex px-3 pb-4">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-full flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-[var(--color-glass-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            style={{
              padding: '8px 0',
              color: 'var(--color-text-muted)',
              background: 'var(--color-glass)',
              border: '1px solid var(--color-glass-border)',
              cursor: 'pointer',
            }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </motion.aside>

      {/* ---- Main content area ---- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="shrink-0 relative">
          <div
            className="flex items-center h-14 px-4 md:px-6"
            style={
              isLight
                ? {
                    background: 'rgba(255, 255, 255, 0.80)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }
                : {
                    background: 'rgba(12, 12, 20, 0.60)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }
            }
          >
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 -ml-2 mr-3 rounded-lg hover:bg-[var(--color-glass-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
              style={{
                color: 'var(--color-text-secondary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: 'var(--color-text-muted)' }}>RVJP</span>
              <span style={{ color: 'var(--color-text-subtle)' }}>/</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {(() => {
                  const item = allNavItems.find((n) => pathname.startsWith(n.to));
                  return item ? (lang === 'ko' ? item.ko : item.ja) : t('매출 현황', '売上現況');
                })()}
              </span>
            </div>

            {/* 글로벌 헤더 버튼 제거 — 각 페이지에서 기간 선택 */}
            <div className="ml-auto" />
          </div>
          {/* Animated gradient border at bottom */}
          <div
            className="animated-gradient-border"
            style={{ height: '1px', opacity: isLight ? 0.6 : 0.4 }}
          />
        </header>

        {/* Page content with transition animation */}
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            className="flex-1 overflow-y-auto"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="min-h-full p-4 md:p-6 lg:p-8 pb-24 sm:pb-8">
              {children}
            </div>
          </motion.main>
        </AnimatePresence>
      </div>

      {/* ---- Mobile bottom navigation (sm:hidden) ---- */}
      <nav
        className="fixed bottom-0 left-0 right-0 sm:hidden z-50 flex items-center justify-around h-16 px-2"
        style={{
          background: isLight
            ? 'rgba(255, 255, 255, 0.90)'
            : 'rgba(12, 12, 20, 0.90)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--color-glass-border)',
        }}
      >
        {mobileNavItems.map((item) => {
          const isActive = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              href={item.to}
              onClick={(e) => {
                if (pathname.startsWith(item.to)) {
                  e.preventDefault();
                  router.push(item.to);
                  router.refresh();
                }
              }}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors duration-150"
              style={{
                minWidth: '48px',
                minHeight: '48px',
                color: isActive
                  ? 'var(--color-accent-blue, #3b82f6)'
                  : 'var(--color-text-muted)',
                textDecoration: 'none',
              }}
            >
              <item.icon size={22} />
              <span className="text-[10px] font-medium leading-none">
                {lang === 'ko' ? item.ko : item.ja}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ClientLayout – wraps everything in AppProvider + Suspense
// ---------------------------------------------------------------------------
export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <SWRConfig value={{
        revalidateOnFocus: false,
        keepPreviousData: true,
      }}>
        <Suspense>
          <LayoutInner>{children}</LayoutInner>
        </Suspense>
      </SWRConfig>
    </AppProvider>
  );
}
