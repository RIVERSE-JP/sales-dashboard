import { supabaseServer } from '@/lib/supabase-server';
import PlatformsClient from '@/components/platforms/PlatformsClient';
import type { PlatformsInitialData } from '@/components/platforms/PlatformsClient';

export const revalidate = 300; // ISR: 5분

export default async function PlatformsPage() {
  let initialData: PlatformsInitialData | null = null;

  try {
    const { data, error } = await supabaseServer.rpc('get_platform_sales_summary');

    if (!error && data) {
      initialData = {
        platforms: data,
      };
    }
  } catch {
    // Server prefetch failed — client will load via SWR
  }

  return <PlatformsClient initialData={initialData} />;
}
