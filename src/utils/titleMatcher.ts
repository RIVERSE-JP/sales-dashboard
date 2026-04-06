import { extractBaseTitle } from '@/lib/supabase';

/** 핵심어 추출: 부제/괄호/번호/문장부호 정규화 */
export function toCore(s: string): string {
  return s
    // 문장부호 정규화 (전각→반각)
    .replace(/～/g, '~').replace(/〜/g, '~')
    .replace(/！/g, '!').replace(/？/g, '?')
    .replace(/　/g, ' ')
    // 부제/괄호 제거
    .replace(/~[^~]*~/g, '')
    .replace(/【[^】]*】/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, '')
    .trim();
}

interface TitleKrMaps {
  krExact: Map<string, string>;
  krBase: Map<string, string>;
  krCore: Map<string, string>;
}

/** title_master 데이터로 매칭 맵 구축 */
export function buildTitleKrMaps(masterData: Array<{ title_jp: string; title_kr: string | null }>): TitleKrMaps {
  const krExact = new Map<string, string>();
  const krBase = new Map<string, string>();
  const krCore = new Map<string, string>();
  for (const m of masterData) {
    if (m.title_jp && m.title_kr) {
      krExact.set(m.title_jp, m.title_kr);
      krBase.set(extractBaseTitle(m.title_jp), m.title_kr);
      const c = toCore(m.title_jp);
      if (c && !krCore.has(c)) krCore.set(c, m.title_kr);
    }
  }
  return { krExact, krBase, krCore };
}

/** title_jp에 대한 title_kr 매칭 (정확 → base → 핵심어 순서 폴백) */
export function matchTitleKr(titleJp: string, maps: TitleKrMaps): string {
  return maps.krExact.get(titleJp)
    || maps.krBase.get(extractBaseTitle(titleJp))
    || maps.krCore.get(toCore(titleJp))
    || '';
}
