import { Suspense } from 'react';
import { supabaseServer } from '@/lib/supabase-server';
import TitleCompareClient from '@/components/title-compare/TitleCompareClient';
import type { TitleCompareInitialData } from '@/components/title-compare/TitleCompareClient';

export const revalidate = 300;

async function TitleComparePageInner() {
  let initialData: TitleCompareInitialData | null = null;

  try {
    const [summariesRes, masterRes] = await Promise.allSettled([
      supabaseServer.rpc('get_title_summaries'),
      supabaseServer.from('titles').select('*, production_companies(name), genres(name_kr, name_jp)').eq('is_active', true),
    ]);

    initialData = {
      summaries:
        summariesRes.status === 'fulfilled' && !summariesRes.value.error
          ? summariesRes.value.data
          : null,
      titleMaster:
        masterRes.status === 'fulfilled' && !masterRes.value.error
          ? masterRes.value.data
          : null,
    };
  } catch {
    // prefetch 실패 시 클라이언트 SWR이 대체
  }

  return <TitleCompareClient initialData={initialData} />;
}

export default function TitleComparePage() {
  return (
    <Suspense>
      <TitleComparePageInner />
    </Suspense>
  );
}
