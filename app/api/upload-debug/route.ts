import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/upload-debug
 * 업로드 시도 시 원본 파일 + 메타데이터를 Supabase Storage에 저장
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const metadata = formData.get('metadata') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const meta = metadata ? JSON.parse(metadata) : {};
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = file.name.replace(/[^a-zA-Z0-9가-힣ぁ-んァ-ヶ一-龠._-]/g, '_');
    const storagePath = `uploads/${timestamp}_${safeName}`;

    // 파일을 Supabase Storage에 저장
    const buffer = await file.arrayBuffer();
    const { error: storageError } = await supabaseServer.storage
      .from('upload-debug')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    // Storage 버킷이 없으면 생성 시도
    if (storageError?.message?.includes('not found') || storageError?.message?.includes('Bucket')) {
      await supabaseServer.storage.createBucket('upload-debug', {
        public: false,
        fileSizeLimit: 52428800, // 50MB
      });
      // 재시도
      const { error: retryError } = await supabaseServer.storage
        .from('upload-debug')
        .upload(storagePath, buffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });
      if (retryError) {
        console.error('Storage retry failed:', retryError);
      }
    }

    // upload_logs에 기록 (file_path 포함)
    const logEntry = {
      upload_type: meta.uploadType || 'sokuhochi',
      source_file: file.name,
      row_count: meta.rowCount ?? 0,
      status: meta.status || 'failed',
      error_message: meta.errorMessage || null,
      platforms: meta.platform ? [meta.platform] : null,
      date_range_start: meta.dateStart || null,
      date_range_end: meta.dateEnd || null,
    };

    const { data: logData, error: logError } = await supabaseServer
      .from('upload_logs')
      .insert(logEntry)
      .select('id')
      .single();

    if (logError) {
      console.error('Log insert failed:', logError);
    }

    // 파일 다운로드 URL 생성 (1시간 유효)
    const { data: urlData } = await supabaseServer.storage
      .from('upload-debug')
      .createSignedUrl(storagePath, 3600);

    return NextResponse.json({
      success: true,
      logId: logData?.id,
      filePath: storagePath,
      downloadUrl: urlData?.signedUrl,
    });
  } catch (err) {
    console.error('Upload debug error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/upload-debug?path=uploads/...
 * Storage에 저장된 파일의 다운로드 URL 생성
 */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path');
  if (!path) {
    return NextResponse.json({ error: 'path required' }, { status: 400 });
  }

  const { data } = await supabaseServer.storage
    .from('upload-debug')
    .createSignedUrl(path, 3600);

  if (!data?.signedUrl) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  return NextResponse.json({ downloadUrl: data.signedUrl });
}
