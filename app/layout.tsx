import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ClientLayout } from '@/components/layout/ClientLayout';
import './globals.css';

export const metadata: Metadata = {
  title: '매출 현황 보드 - RIVERSE',
  description: 'RIVERSE Japan Sales Dashboard',
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
  },
};

function LoadingSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0a14',
        color: '#666',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      Loading...
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Suspense fallback={<LoadingSkeleton />}>
          <ClientLayout>{children}</ClientLayout>
        </Suspense>
      </body>
    </html>
  );
}
