import { Suspense } from 'react';
import { ClientLayout } from '@/components/layout/ClientLayout';

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
        fontFamily: 'Meiryo, メイリオ, system-ui, sans-serif',
      }}
    >
      Loading...
    </div>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ClientLayout>{children}</ClientLayout>
    </Suspense>
  );
}
