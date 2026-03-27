import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  Globe,
  Rocket,
  Database,
  Upload,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Clock,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

// ---------------------------------------------------------------------------
// Navigation config with i18n labels
// ---------------------------------------------------------------------------
const navItems = [
  { to: '/dashboard', ko: '\uACBD\uC601 \uC694\uC57D', ja: '\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9', icon: LayoutDashboard },
  { to: '/titles', ko: '\uC791\uD488\uBCC4 \uBD84\uC11D', ja: '\u30BF\u30A4\u30C8\u30EB\u5206\u6790', icon: BookOpen },
  { to: '/platforms', ko: '\uD50C\uB7AB\uD3FC\uBCC4 \uBD84\uC11D', ja: '\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0\u5206\u6790', icon: Globe },
  { to: '/initial-sales', ko: '\uCD08\uB3D9\uB9E4\uCD9C \uBE44\uAD50', ja: '\u521D\u52D5\u58F2\u4E0A\u6BD4\u8F03', icon: Rocket },
  { to: '/data', ko: '\uB370\uC774\uD130', ja: '\u30C7\u30FC\u30BF', icon: Database },
  { to: '/upload', ko: '\uB370\uC774\uD130 \uC5C5\uB370\uC774\uD2B8', ja: '\u30C7\u30FC\u30BF\u66F4\u65B0', icon: Upload },
] as const;

// ---------------------------------------------------------------------------
// Page transition variants
// ---------------------------------------------------------------------------
const pageVariants = {
  initial: { opacity: 0, y: 16, filter: 'blur(4px)' },
  enter: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: 'blur(4px)',
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// Toggle button component
function ToggleButton({
  active,
  onClick,
  children,
  isLight,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  isLight: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 text-[11px] font-semibold transition-all duration-200 cursor-pointer"
      style={{
        background: active
          ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
          : 'transparent',
        color: active
          ? '#ffffff'
          : isLight
            ? '#9999aa'
            : '#55556a',
        borderRadius: '6px',
        border: 'none',
      }}
    >
      {children}
    </button>
  );
}

export function Layout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const now = useCurrentTime();
  const { lang, setLang, currency, setCurrency, theme, setTheme, t } = useApp();

  const sidebarWidth = collapsed ? 72 : 260;
  const isLight = theme === 'light';

  return (
    <div
      className={`flex h-screen overflow-hidden ${isLight ? 'theme-light' : ''}`}
      style={{ backgroundColor: isLight ? '#f5f5f8' : '#0a0a0f' }}
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
        style={
          isLight
            ? {
                background: '#ffffff',
                borderRight: '1px solid #e2e2ea',
              }
            : {
                background: 'rgba(12, 12, 20, 0.80)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              }
        }
      >
        {/* Logo area */}
        <div className="flex items-center h-16 px-4 shrink-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}
          >
            <span
              style={{
                fontWeight: 900,
                fontSize: '14px',
                color: '#fff',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              RV
            </span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="ml-3 overflow-hidden whitespace-nowrap"
              >
                <span
                  className="font-extrabold text-base tracking-wider"
                  style={{
                    background: isLight
                      ? 'linear-gradient(135deg, #1a1a2e 0%, #6366f1 50%, #3b82f6 100%)'
                      : 'linear-gradient(135deg, #f0f0f5 0%, #a78bfa 50%, #3b82f6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '0.15em',
                  }}
                >
                  RIVERSE
                </span>
                <span
                  className="block text-[10px] tracking-[0.15em] font-medium"
                  style={{ color: isLight ? '#9999aa' : '#55556a' }}
                >
                  {t('\uB9E4\uCD9C \uD604\uD669 \uBCF4\uB4DC', '\u58F2\u4E0A\u73FE\u6CC1\u30DC\u30FC\u30C9')}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto md:hidden p-1.5 rounded-lg"
            style={{
              color: isLight ? '#9999aa' : '#8888a0',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Divider */}
        <div
          className="mx-4 mb-2"
          style={{
            borderBottom: isLight
              ? '1px solid #e2e2ea'
              : '1px solid rgba(255, 255, 255, 0.04)',
          }}
        />

        {/* Nav links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className="group relative flex items-center rounded-xl transition-all duration-200"
              style={({ isActive }) => ({
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                color: isActive
                  ? isLight
                    ? '#1a1a2e'
                    : '#f0f0f5'
                  : isLight
                    ? '#6b6b80'
                    : '#8888a0',
                background: isActive
                  ? isLight
                    ? 'rgba(99, 102, 241, 0.08)'
                    : 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(139, 92, 246, 0.08))'
                  : 'transparent',
                boxShadow: isActive && !isLight
                  ? '0 0 20px rgba(99, 102, 241, 0.15), inset 0 0 20px rgba(99, 102, 241, 0.05)'
                  : 'none',
                textDecoration: 'none',
              })}
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator bar */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
                      style={{
                        height: '60%',
                        background: 'linear-gradient(180deg, #3b82f6, #8b5cf6)',
                        boxShadow: '0 0 12px rgba(99, 102, 241, 0.5)',
                      }}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}

                  <div
                    className="shrink-0 transition-colors duration-200"
                    style={{ color: isActive ? '#a78bfa' : undefined }}
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
                          ? 'rgba(0, 0, 0, 0.03)'
                          : 'rgba(255, 255, 255, 0.03)',
                    }}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Theme, Language, Currency toggles */}
        {!collapsed && (
          <div
            className="px-4 py-3 space-y-2.5"
            style={{
              borderTop: isLight ? '1px solid #e2e2ea' : '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            {/* Theme toggle */}
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-medium tracking-wider"
                style={{ color: isLight ? '#9999aa' : '#8888a0' }}
              >
                THEME
              </span>
              <div
                className="flex rounded-lg overflow-hidden"
                style={{
                  border: isLight ? '1px solid #e2e2ea' : '1px solid rgba(255, 255, 255, 0.10)',
                }}
              >
                <ToggleButton active={theme === 'dark'} onClick={() => setTheme('dark')} isLight={isLight}>
                  Dark
                </ToggleButton>
                <ToggleButton active={theme === 'light'} onClick={() => setTheme('light')} isLight={isLight}>
                  Light
                </ToggleButton>
              </div>
            </div>

            {/* Lang toggle */}
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-medium tracking-wider"
                style={{ color: isLight ? '#9999aa' : '#8888a0' }}
              >
                LANG
              </span>
              <div
                className="flex rounded-lg overflow-hidden"
                style={{
                  border: isLight ? '1px solid #e2e2ea' : '1px solid rgba(255, 255, 255, 0.10)',
                }}
              >
                <ToggleButton active={lang === 'ko'} onClick={() => setLang('ko')} isLight={isLight}>
                  KO
                </ToggleButton>
                <ToggleButton active={lang === 'ja'} onClick={() => setLang('ja')} isLight={isLight}>
                  JA
                </ToggleButton>
              </div>
            </div>

            {/* Currency toggle */}
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-medium tracking-wider"
                style={{ color: isLight ? '#9999aa' : '#8888a0' }}
              >
                CURRENCY
              </span>
              <div
                className="flex rounded-lg overflow-hidden"
                style={{
                  border: isLight ? '1px solid #e2e2ea' : '1px solid rgba(255, 255, 255, 0.10)',
                }}
              >
                <ToggleButton active={currency === 'JPY'} onClick={() => setCurrency('JPY')} isLight={isLight}>
                  JPY
                </ToggleButton>
                <ToggleButton active={currency === 'KRW'} onClick={() => setCurrency('KRW')} isLight={isLight}>
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
            className="w-full flex items-center justify-center rounded-xl transition-all duration-200"
            style={{
              padding: '8px 0',
              color: isLight ? '#9999aa' : '#55556a',
              background: isLight ? '#f0f0f5' : 'rgba(255, 255, 255, 0.03)',
              border: isLight ? '1px solid #e2e2ea' : '1px solid rgba(255, 255, 255, 0.04)',
              cursor: 'pointer',
            }}
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
              className="md:hidden p-2 -ml-2 mr-3 rounded-lg"
              style={{
                color: isLight ? '#6b6b80' : '#8888a0',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: isLight ? '#9999aa' : '#55556a' }}>RVJP</span>
              <span style={{ color: isLight ? '#d0d0e0' : '#2a2a3e' }}>/</span>
              <span style={{ color: isLight ? '#6b6b80' : '#8888a0' }}>
                {(() => {
                  const item = navItems.find((n) => location.pathname.startsWith(n.to));
                  return item ? (lang === 'ko' ? item.ko : item.ja) : t('\uACBD\uC601 \uC694\uC57D', '\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9');
                })()}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-4">
              {/* Date/time badge */}
              <div
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={
                  isLight
                    ? {
                        background: '#f0f0f5',
                        border: '1px solid #e2e2ea',
                      }
                    : {
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }
                }
              >
                <Clock size={12} style={{ color: isLight ? '#9999aa' : '#55556a' }} />
                <span
                  className="text-xs font-medium"
                  style={{ color: isLight ? '#6b6b80' : '#8888a0' }}
                >
                  {now.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}
                  {' '}
                  {now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Live indicator with pulse */}
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full pulse-live"
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                  }}
                />
                <span className="text-xs font-medium" style={{ color: isLight ? '#9999aa' : '#55556a' }}>
                  Live
                </span>
              </div>
            </div>
          </div>
          {/* Animated gradient border at bottom */}
          <div
            className="animated-gradient-border"
            style={{ height: '1px', opacity: isLight ? 0.6 : 0.4 }}
          />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              className="min-h-full p-4 md:p-6 lg:p-8"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
