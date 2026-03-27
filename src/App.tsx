import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { TitleAnalysis } from '@/pages/TitleAnalysis';
import { PlatformAnalysis } from '@/pages/PlatformAnalysis';
import { InitialSales } from '@/pages/InitialSales';
import { RawData } from '@/pages/RawData';
import { DataUpload } from '@/pages/DataUpload';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/titles" element={<TitleAnalysis />} />
            <Route path="/platforms" element={<PlatformAnalysis />} />
            <Route path="/initial-sales" element={<InitialSales />} />
            <Route path="/data" element={<RawData />} />
            <Route path="/upload" element={<DataUpload />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
