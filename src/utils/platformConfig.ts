// ---------------------------------------------------------------------------
// Platform Brand Configuration
// Each platform has brand colors, logo path, icon abbreviation, and display names
// ---------------------------------------------------------------------------

export interface PlatformBrand {
  color: string;       // primary brand color
  bgColor: string;     // light background for cards/badges
  borderColor: string; // subtle border
  icon: string;        // short abbreviation (fallback)
  logo: string;        // path to logo image in /public/icons/
  nameKR: string;
  nameJP: string;
}

export const PLATFORM_BRANDS: Record<string, PlatformBrand> = {
  Piccoma: {
    color: '#F2C811',        // 옐로우 (말풍선)
    bgColor: '#FFF9E0',
    borderColor: '#F5E08A',
    icon: 'P',
    logo: '/icons/piccoma.png',
    nameKR: '피코마',
    nameJP: 'ピッコマ',
  },
  piccoma: {
    color: '#F2C811',
    bgColor: '#FFF9E0',
    borderColor: '#F5E08A',
    icon: 'P',
    logo: '/icons/piccoma.png',
    nameKR: '피코마',
    nameJP: 'ピッコマ',
  },
  Mechacomic: {
    color: '#2DC8C8',        // 터콰이즈 (배경)
    bgColor: '#E6F9F9',
    borderColor: '#A3E8E8',
    icon: 'MC',
    logo: '/icons/mechacomic.png',
    nameKR: '메차코믹',
    nameJP: 'めちゃコミ',
  },
  cmoa: {
    color: '#F27D1E',        // 오렌지 (캐릭터+텍스트)
    bgColor: '#FFF2E6',
    borderColor: '#FDC99B',
    icon: 'C',
    logo: '/icons/cmoa.png',
    nameKR: 'CMOA',
    nameJP: 'コミックシーモア',
  },
  'LINEマンガ': {
    color: '#06C755',        // LINE 그린
    bgColor: '#E6F9ED',
    borderColor: '#A3E4BB',
    icon: 'L',
    logo: '/icons/linemanga.png',
    nameKR: 'LINE만화',
    nameJP: 'LINEマンガ',
  },
  ebookjapan: {
    color: '#E8546D',        // 코랄 레드 (책 아이콘)
    bgColor: '#FDECEF',
    borderColor: '#F5B3BF',
    icon: 'eB',
    logo: '/icons/ebookjapan.jpg',
    nameKR: 'ebookjapan',
    nameJP: 'ebookjapan',
  },
  'DMM(FANZA)': {
    color: '#D4272E',        // 레드 (FANZA 로고)
    bgColor: '#FDE8E9',
    borderColor: '#F5AAAD',
    icon: 'FZ',
    logo: '/icons/fanza.png',
    nameKR: 'FANZA',
    nameJP: 'FANZAブックス',
  },
  Renta: {
    color: '#8DC21F',        // 라임 그린 (배경)
    bgColor: '#F2FAE6',
    borderColor: '#C8E89B',
    icon: 'R',
    logo: '/icons/renta.png',
    nameKR: 'Renta',
    nameJP: 'Renta!',
  },
  'U-NEXT': {
    color: '#232323',        // 블랙 (배경)
    bgColor: '#F0F0F0',
    borderColor: '#C0C0C0',
    icon: 'U',
    logo: '/icons/unext.png',
    nameKR: 'U-NEXT',
    nameJP: 'U-NEXT',
  },
  DMM: {
    color: '#E8820E',        // 오렌지 (밑줄 악센트)
    bgColor: '#FFF4E6',
    borderColor: '#FDC99B',
    icon: 'D',
    logo: '/icons/dmm.png',
    nameKR: 'DMM',
    nameJP: 'DMMブックス',
  },
  'まんが王国': {
    color: '#F5921B',        // 오렌지 (책 아이콘)
    bgColor: '#FFF4E5',
    borderColor: '#FDD19B',
    icon: '王',
    logo: '/icons/mangaoukoku.jpeg',
    nameKR: '만화왕국',
    nameJP: 'まんが王国',
  },
};

// 채널명 정규화: 모든 변형 → DB channel 값으로 통일
const CHANNEL_ALIASES: Record<string, string> = {
  // Piccoma (DB: 'Piccoma') — 광고/유료/무제한 등 변형 모두 통합
  'Piccoma': 'Piccoma',
  'piccoma': 'Piccoma',
  'PICCOMA': 'Piccoma',
  'ピッコマ': 'Piccoma',
  'piccoma_ads': 'Piccoma',
  'piccoma_sales': 'Piccoma',
  'piccoma france': 'Piccoma',
  'piccoma무제한읽기(読み放題)': 'Piccoma',
  // Mechacomic (DB: 'Mechacomic')
  'Mechacomic': 'Mechacomic',
  'mechacomic': 'Mechacomic',
  'MECHACOMIC': 'Mechacomic',
  'めちゃコミック': 'Mechacomic',
  'めちゃコミ': 'Mechacomic',
  // cmoa (DB: 'cmoa')
  'cmoa': 'cmoa',
  'CMOA': 'cmoa',
  'Cmoa': 'cmoa',
  'コミックシーモア': 'cmoa',
  // Renta
  'renta': 'Renta',
  'Renta': 'Renta',
  'Renta!': 'Renta',
  // DMM / FANZA
  'dmm': 'DMM',
  'DMM': 'DMM',
  'DMMブックス': 'DMM',
  'DMM（FANZA）': 'DMM(FANZA)',
  'DMM(FANZA)': 'DMM(FANZA)',
  'dmm_fanza': 'DMM(FANZA)',
  // U-NEXT
  'u-next': 'U-NEXT',
  'U-NEXT': 'U-NEXT',
  // LINEマンガ (광고 포함)
  'LINEマンガ': 'LINEマンガ',
  'line_manga': 'LINEマンガ',
  'line': 'LINEマンガ',
  'LINE': 'LINEマンガ',
  'line_ads': 'LINEマンガ',
  // ebookjapan (웹툰 라인 포함)
  'ebookjapan': 'ebookjapan',
  'ebj': 'ebookjapan',
  'ebj_webtoon': 'ebookjapan',
  // まんが王国
  'まんが王国': 'まんが王国',
  'manga_oukoku': 'まんが王国',
  'manga-kingdom': 'まんが王国',
  // BookLive
  'booklive': 'BookLive',
  'BookLive': 'BookLive',
  'BOOKLIVE': 'BookLive',
  // comico (광고 포함)
  'comico jp': 'comico',
  'comico_jp': 'comico',
  'comico': 'comico',
  'comico_ads': 'comico',
  // BookCOMI
  'bookcomi': 'BookCOMI',
  'BookCOMI': 'BookCOMI',
  // Beltoon
  'beltoon': 'Beltoon',
  'Beltoon': 'Beltoon',
  // Lezhin
  'lezhin': 'Lezhin',
  'Lezhin': 'Lezhin',
  // MangaBang
  'mangabang': 'MangaBang',
  'MangaBang': 'MangaBang',
  // MediaDo
  'mediado_sales': 'MediaDo',
  'mediado': 'MediaDo',
  'MediaDo': 'MediaDo',
};

function resolveChannelName(name: string): string {
  return CHANNEL_ALIASES[name] ?? name;
}

/** 채널명을 정규화 (외부에서 사용 가능) */
export function normalizeChannel(name: string): string {
  return resolveChannelName(name);
}

const DEFAULT_BRAND: PlatformBrand = {
  color: '#94A3B8',
  bgColor: '#F1F5F9',
  borderColor: '#CBD5E1',
  icon: '?',
  logo: '',
  nameKR: '',
  nameJP: '',
};

export function getPlatformBrand(name: string): PlatformBrand {
  const resolved = resolveChannelName(name);
  return PLATFORM_BRANDS[resolved] ?? { ...DEFAULT_BRAND, icon: name.charAt(0).toUpperCase(), nameKR: name, nameJP: name };
}

export function getPlatformColor(name: string): string {
  return PLATFORM_BRANDS[resolveChannelName(name)]?.color ?? '#94A3B8';
}

export function getPlatformLogo(name: string): string {
  return PLATFORM_BRANDS[resolveChannelName(name)]?.logo ?? '';
}

