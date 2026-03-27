import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { Layout } from '@/components/layout/Layout';
import { prefetchAllData } from '@/lib/supabase';

// Lazy-loaded page components for code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const TitleAnalysis = lazy(() => import('@/pages/TitleAnalysis').then(m => ({ default: m.TitleAnalysis })));
const PlatformAnalysis = lazy(() => import('@/pages/PlatformAnalysis').then(m => ({ default: m.PlatformAnalysis })));
const InitialSales = lazy(() => import('@/pages/InitialSales').then(m => ({ default: m.InitialSales })));
const RawData = lazy(() => import('@/pages/RawData').then(m => ({ default: m.RawData })));
const DataUpload = lazy(() => import('@/pages/DataUpload').then(m => ({ default: m.DataUpload })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-6 h-6 border-2 border-[#1A2B5E]/30 border-t-[#1A2B5E] rounded-full animate-spin" />
    </div>
  );
}

function AppInner() {
  // Prefetch ALL page data immediately on app start
  // This runs once and fills the cache in background
  // so every page navigation is instant from cache
  useEffect(() => {
    prefetchAllData();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
          <Route path="/titles" element={<Suspense fallback={<PageLoader />}><TitleAnalysis /></Suspense>} />
          <Route path="/platforms" element={<Suspense fallback={<PageLoader />}><PlatformAnalysis /></Suspense>} />
          <Route path="/initial-sales" element={<Suspense fallback={<PageLoader />}><InitialSales /></Suspense>} />
          <Route path="/data" element={<Suspense fallback={<PageLoader />}><RawData /></Suspense>} />
          <Route path="/upload" element={<Suspense fallback={<PageLoader />}><DataUpload /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
