'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, TrendingUp } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

// ---------------------------------------------------------------------------
// 데이터 스트림 카드 데이터
// ---------------------------------------------------------------------------
type CardData =
  | { type: 'kpi'; label: string; value: string; change: string; color: string }
  | { type: 'sparkline'; label: string; points: number[]; color: string }
  | { type: 'platform'; icon: string; name: string; value: string }
  | { type: 'title'; rank: number; name: string; sales: string }
  | { type: 'bar'; items: { label: string; pct: number; color: string }[] };

const column1: CardData[] = [
  { type: 'kpi', label: '월간 매출', value: '¥12.4億', change: '+8.2%', color: '#10b981' },
  { type: 'platform', icon: '/icons/piccoma.png', name: 'ピッコマ', value: '¥4.3億' },
  { type: 'sparkline', label: '주간 추이', points: [20, 35, 28, 45, 38, 52, 48], color: '#38a9f8' },
  { type: 'title', rank: 1, name: '転生したらスライムだった件', sales: '¥1.2億' },
  { type: 'kpi', label: '신규 작품', value: '28건', change: '+5', color: '#8b5cf6' },
  { type: 'platform', icon: '/icons/linemanga.png', name: 'LINEマンガ', value: '¥3.5億' },
  { type: 'sparkline', label: '성장률', points: [40, 42, 38, 50, 55, 60, 58], color: '#10b981' },
  { type: 'title', rank: 5, name: '薬屋のひとりごと', sales: '¥0.8億' },
  { type: 'kpi', label: '전월비', value: '+12.3%', change: '↑', color: '#38a9f8' },
  { type: 'platform', icon: '/icons/cmoa.png', name: 'コミックシーモア', value: '¥1.8億' },
];

const column2: CardData[] = [
  { type: 'platform', icon: '/icons/ebookjapan.jpg', name: 'ebookjapan', value: '¥2.1億' },
  { type: 'kpi', label: '활성 작품', value: '342건', change: '+12', color: '#38a9f8' },
  { type: 'title', rank: 2, name: '呪術廻戦', sales: '¥1.1億' },
  { type: 'sparkline', label: '일별 매출', points: [60, 55, 70, 65, 72, 68, 75], color: '#f59e0b' },
  { type: 'bar', items: [
    { label: 'ピッコマ', pct: 35, color: '#38a9f8' },
    { label: 'LINE', pct: 28, color: '#10b981' },
    { label: 'ebookjp', pct: 18, color: '#f59e0b' },
  ]},
  { type: 'kpi', label: '주간 성장', value: '+5.7%', change: '↑', color: '#f59e0b' },
  { type: 'platform', icon: '/icons/renta.png', name: 'Renta!', value: '¥0.9億' },
  { type: 'title', rank: 3, name: 'ワンピース', sales: '¥1.0億' },
  { type: 'sparkline', label: '플랫폼별', points: [30, 45, 35, 50, 42, 55, 48], color: '#8b5cf6' },
  { type: 'kpi', label: 'DAU', value: '1.2万', change: '+340', color: '#10b981' },
];

const column3: CardData[] = [
  { type: 'title', rank: 4, name: '推しの子', sales: '¥0.9億' },
  { type: 'sparkline', label: '매출 추이', points: [25, 30, 28, 35, 40, 38, 45], color: '#38a9f8' },
  { type: 'platform', icon: '/icons/mechacomic.png', name: 'めちゃコミック', value: '¥1.5億' },
  { type: 'kpi', label: '플랫폼', value: '5개', change: '연동', color: '#8b5cf6' },
  { type: 'bar', items: [
    { label: 'WEBTOON', pct: 45, color: '#38a9f8' },
    { label: 'コミック', pct: 35, color: '#f59e0b' },
    { label: 'ノベル', pct: 20, color: '#10b981' },
  ]},
  { type: 'platform', icon: '/icons/dmm.png', name: 'DMM', value: '¥0.7億' },
  { type: 'title', rank: 6, name: 'ブルーロック', sales: '¥0.7億' },
  { type: 'kpi', label: '총 매출', value: '¥12.4億', change: '+8.2%', color: '#10b981' },
  { type: 'sparkline', label: '분기 추이', points: [50, 48, 55, 52, 60, 58, 65], color: '#10b981' },
  { type: 'platform', icon: '/icons/unext.png', name: 'U-NEXT', value: '¥0.5億' },
];

const column4: CardData[] = [
  { type: 'kpi', label: '전환율', value: '4.8%', change: '+0.3%', color: '#38a9f8' },
  { type: 'title', rank: 7, name: '葬送のフリーレン', sales: '¥0.6億' },
  { type: 'platform', icon: '/icons/piccoma.png', name: 'ピッコマ', value: '¥4.3億' },
  { type: 'sparkline', label: '주별 DAU', points: [70, 65, 75, 72, 80, 78, 82], color: '#f59e0b' },
  { type: 'kpi', label: 'ARPU', value: '¥580', change: '+¥20', color: '#10b981' },
  { type: 'platform', icon: '/icons/fanza.png', name: 'FANZA', value: '¥0.4億' },
  { type: 'bar', items: [
    { label: '新作', pct: 30, color: '#8b5cf6' },
    { label: '既刊', pct: 50, color: '#38a9f8' },
    { label: 'オリジナル', pct: 20, color: '#10b981' },
  ]},
  { type: 'title', rank: 8, name: 'キングダム', sales: '¥0.5億' },
  { type: 'sparkline', label: '월별 매출', points: [35, 42, 38, 48, 45, 52, 50], color: '#38a9f8' },
  { type: 'kpi', label: '리텐션', value: '68%', change: '+2.1%', color: '#10b981' },
];

// ---------------------------------------------------------------------------
// 데이터 카드 렌더러
// ---------------------------------------------------------------------------
function DataCard({ data }: { data: CardData }) {
  switch (data.type) {
    case 'kpi':
      return (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
          <p className="text-[9px] text-white/30">{data.label}</p>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-[15px] font-bold text-white/70">{data.value}</span>
            <span className="text-[9px] font-semibold" style={{ color: data.color }}>{data.change}</span>
          </div>
        </div>
      );
    case 'sparkline': {
      const w = 100;
      const h = 28;
      const max = Math.max(...data.points);
      const line = data.points.map((p, i) => `${(i / (data.points.length - 1)) * w},${h - (p / max) * h}`).join(' ');
      return (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
          <p className="mb-1 text-[9px] text-white/30">{data.label}</p>
          <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={24} preserveAspectRatio="none">
            <polyline points={line} fill="none" stroke={data.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
          </svg>
        </div>
      );
    }
    case 'platform':
      return (
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
          <img src={data.icon} alt="" className="h-5 w-5 shrink-0 rounded object-contain" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] text-white/50">{data.name}</p>
            <p className="text-[13px] font-semibold text-white/70">{data.value}</p>
          </div>
        </div>
      );
    case 'title':
      return (
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold"
            style={{ background: 'rgba(56,169,248,0.15)', color: '#38a9f8' }}
          >
            {data.rank}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] text-white/50">{data.name}</p>
            <p className="text-[12px] font-semibold text-white/60">{data.sales}</p>
          </div>
        </div>
      );
    case 'bar':
      return (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
          <div className="flex flex-col gap-1.5">
            {data.items.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-right text-[8px] text-white/30">{item.label}</span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
                  <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.color, opacity: 0.5 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// 스크롤링 컬럼
// ---------------------------------------------------------------------------
function ScrollColumn({
  cards,
  direction,
  duration,
}: {
  cards: CardData[];
  direction: 'up' | 'down';
  duration: number;
}) {
  // 2벌 복제하여 무한 루프
  const doubled = [...cards, ...cards];
  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        className={`flex flex-col gap-3 ${direction === 'up' ? 'animate-scroll-up' : 'animate-scroll-down'}`}
        style={{ animationDuration: `${duration}s` }}
      >
        {doubled.map((card, i) => (
          <DataCard key={i} data={card} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 로그인 페이지
// ---------------------------------------------------------------------------
export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      await login(
        formData.get('email') as string,
        formData.get('password') as string,
      );
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ---- Left Panel: 데이터 스트림 ---- */}
      <div className="relative hidden overflow-hidden bg-primary md:flex md:w-[55%]">
        {/* 배경 글로우 */}
        <motion.div
          className="pointer-events-none absolute h-[500px] w-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(56,169,248,0.08) 0%, transparent 70%)' }}
          animate={{ x: [0, 60, -40, 0], y: [0, -50, 30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          initial={{ left: '20%', top: '10%' }}
        />
        <motion.div
          className="pointer-events-none absolute h-[400px] w-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(56,169,248,0.06) 0%, transparent 70%)' }}
          animate={{ x: [0, -30, 50, 0], y: [0, 40, -20, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
          initial={{ right: '10%', bottom: '20%' }}
        />

        {/* 도트 그리드 배경 */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />

        {/* 스크롤링 데이터 컬럼 */}
        <div className="absolute inset-0 flex gap-3 px-4 py-4">
          <ScrollColumn cards={column1} direction="up" duration={40} />
          <ScrollColumn cards={column2} direction="down" duration={45} />
          <ScrollColumn cards={column3} direction="up" duration={42} />
          <ScrollColumn cards={column4} direction="down" duration={48} />
        </div>

        {/* 오버레이 그라데이션 */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,59,113,0.90) 0%, rgba(0,59,113,0.50) 30%, rgba(0,59,113,0.50) 70%, rgba(0,59,113,0.95) 100%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background: 'linear-gradient(to right, rgba(0,59,113,0.85) 0%, rgba(0,59,113,0.30) 50%, rgba(0,59,113,0.70) 100%)',
          }}
        />

        {/* 전경: 로고 + 카피 */}
        <div className="relative z-20 flex flex-col justify-between p-12">
          {/* 로고 */}
          <div className="flex items-center gap-2.5">
            <img
              src="/riverse_logo.png"
              alt="RIVERSE"
              className="h-7"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <span className="text-sm font-bold text-white/80">매출 현황 보드</span>
          </div>

          {/* 하단 카피 */}
          <div>
            <h1 className="mb-2.5 text-[28px] font-bold leading-[1.4] text-white/90">
              데이터로 보는
              <br />
              <span className="text-riverse-blue-400">매출의 모든 것</span>
            </h1>
            <p className="mb-6 text-[13px] leading-[1.7] text-white/40">
              속보치 업로드부터 주간 리포트까지,
              <br />
              일본 플랫폼 매출 데이터를 한 곳에서.
            </p>
            <p className="text-[11px] text-white/25">&copy; 2026 Riverse. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* ---- Right Panel: 로그인 폼 ---- */}
      <div className="flex flex-1 items-center justify-center border-l border-border bg-background px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[380px]"
        >
          {/* 모바일 로고 */}
          <div className="mb-9 flex items-center gap-2 md:hidden">
            <img src="/riverse_logo.png" alt="RIVERSE" className="h-[26px]" />
            <span className="text-[13px] font-semibold text-muted-foreground">매출 현황 보드</span>
          </div>

          {/* 타이틀 */}
          <div className="mb-1.5 flex items-center gap-2">
            <TrendingUp size={20} className="text-ring" />
            <h2 className="text-2xl font-bold text-foreground">로그인</h2>
          </div>
          <p className="mb-8 text-[13px] text-muted-foreground">매출 현황 보드에 접속합니다.</p>

          <form onSubmit={handleSubmit} noValidate>
            {/* 이메일 */}
            <div className="mb-5">
              <label htmlFor="email" className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
                이메일
              </label>
              <div className="relative">
                <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@company.com"
                  className="w-full rounded-[10px] border border-input bg-input/40 py-3 pl-10 pr-3.5 text-[14px] text-foreground placeholder:text-muted-foreground/40 transition-[border-color,box-shadow] duration-200 outline-none focus:border-ring focus:shadow-[0_0_0_3px_rgba(56,169,248,0.15)]"
                />
              </div>
            </div>

            {/* 비밀번호 */}
            <div className="mb-7">
              <label htmlFor="password" className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
                비밀번호
              </label>
              <div className="relative">
                <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-[10px] border border-input bg-input/40 py-3 pl-10 pr-11 text-[14px] text-foreground transition-[border-color,box-shadow] duration-200 outline-none focus:border-ring focus:shadow-[0_0_0_3px_rgba(56,169,248,0.15)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex cursor-pointer items-center p-1 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* 에러 */}
            {error && (
              <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-center text-[13px] text-destructive">
                {error}
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full cursor-pointer rounded-[10px] py-3.5 text-[14px] font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 비밀번호 찾기 */}
          <div className="mt-5 text-center">
            <button
              type="button"
              className="cursor-pointer bg-transparent text-[12px] text-muted-foreground/60 transition-colors hover:text-ring"
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
