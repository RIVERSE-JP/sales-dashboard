import { Suspense } from 'react';
import { supabaseServer } from '@/lib/supabase-server';
import TitlesClient from '@/components/titles/TitlesClient';
import type { TitlesInitialData } from '@/components/titles/TitlesClient';

export const revalidate = 300; // ISR: 5분

async function TitlesPageInner() {
  let initialData: TitlesInitialData | null = null;

  try {
    const [summariesRes, masterRes, genresRes] = await Promise.allSettled([
      // Try get_title_summaries first; if it fails we still have null (client fallback)
      supabaseServer.rpc('get_title_summaries'),
      supabaseServer.from('titles').select('*, production_companies(name)').eq('is_active', true),
      supabaseServer.from('genres').select('*'),
    ]);

    initialData = {
      summaries: summariesRes.status === 'fulfilled' && !summariesRes.value.error
        ? summariesRes.value.data
        : null,
      titleMaster: masterRes.status === 'fulfilled' && !masterRes.value.error
        ? masterRes.value.data
        : null,
      genres: genresRes.status === 'fulfilled' && !genresRes.value.error
        ? genresRes.value.data
        : null,
    };
  } catch {
    // Server prefetch failed — client will load via SWR
  }

  return <TitlesClient initialData={initialData} />;
}

export default function TitlesPage() {
  // Suspense is needed because TitlesClient uses useSearchParams()
  return (
    <Suspense>
      <TitlesPageInner />
    </Suspense>
  );
}
