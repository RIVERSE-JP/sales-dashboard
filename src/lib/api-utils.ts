/**
 * API route helper utilities.
 *
 * TODO: 향후 API route에서 이 헬퍼를 사용하여 에러 처리를 일관화할 것.
 * 예: return apiError('Not found', 404);
 *     return apiSuccess(data);
 */

import { NextResponse } from 'next/server';

export function apiError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess<T>(data: T) {
  return NextResponse.json(data);
}
