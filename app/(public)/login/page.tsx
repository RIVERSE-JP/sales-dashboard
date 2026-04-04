'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, TrendingUp, BarChart3, Activity } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

// ---------------------------------------------------------------------------
// 애니메이션 variants
// ---------------------------------------------------------------------------
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

// ---------------------------------------------------------------------------
// 왼쪽 패널: 미니 KPI 카드
// ---------------------------------------------------------------------------
const kpis = [
  { label: '월간 매출', value: '¥12.4억', change: '+8.2%', color: '#10b981', barPct: 72 },
  { label: '활성 작품', value: '342건', change: '+12', color: '#38a9f8', barPct: 85 },
  { label: '주간 성장률', value: '+5.7%', change: '↑', color: '#f59e0b', barPct: 57 },
  { label: '플랫폼', value: '5개', change: '연동', color: '#8b5cf6', barPct: 100 },
];

type KPIItem = (typeof kpis)[number];

function MiniKPICard({ label, value, change, color, barPct }: KPIItem) {
  return (
    <div className="relative overflow-hidden rounded-[10px] border border-white/10 bg-white/[0.06] px-3.5 pb-2.5 pt-3.5">
      {/* 좌측 컬러 바 */}
      <div
        className="absolute bottom-0 left-0 top-0 w-[3px] rounded-l-[10px]"
        style={{ backgroundColor: color }}
      />
      <p className="mb-1 text-[10px] text-white/50">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[18px] font-bold text-white/90">{value}</span>
        <span className="text-[10px] font-semibold" style={{ color }}>{change}</span>
      </div>
      {/* 게이지 바 */}
      <div className="mt-2 h-[3px] overflow-hidden rounded-sm bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${barPct}%` }}
          transition={{ duration: 1, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-sm"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 왼쪽 패널: 미니 에어리어 차트 (SVG)
// ---------------------------------------------------------------------------
function MiniAreaChart() {
  const points = [20, 35, 28, 45, 38, 52, 48, 62, 55, 70, 65, 78];
  const w = 320;
  const h = 100;
  const maxY = 90;
  const step = w / (points.length - 1);

  const line = points.map((p, i) => `${i * step},${h - (p / maxY) * h}`).join(' ');
  const area = `0,${h} ${line} ${w},${h}`;

  return (
    <div className="rounded-[10px] border border-white/10 bg-white/[0.06] px-4 pb-3 pt-3.5">
      <div className="mb-2.5 flex items-center gap-1.5 text-[11px] text-white/40">
        <Activity size={12} />
        매출 추이 (최근 12주)
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={80} preserveAspectRatio="none">
        <defs>
          <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#38a9f8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#38a9f8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.polygon
          points={area}
          fill="url(#area-fill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
        />
        <motion.polyline
          points={line}
          fill="none"
          stroke="#38a9f8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="mt-1 flex justify-between text-[9px] text-white/25">
        <span>1주차</span>
        <span>6주차</span>
        <span>12주차</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 왼쪽 패널: 플랫폼별 바 차트
// ---------------------------------------------------------------------------
const platforms = [
  { name: '피코마', pct: 35, color: '#38a9f8' },
  { name: '라인망가', pct: 28, color: '#10b981' },
  { name: '이북재팬', pct: 18, color: '#f59e0b' },
  { name: '메차코믹', pct: 12, color: '#8b5cf6' },
  { name: '렌타!', pct: 7, color: '#ef4444' },
];

function MiniBarChart() {
  return (
    <div className="rounded-[10px] border border-white/10 bg-white/[0.06] px-4 py-3.5">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] text-white/40">
        <BarChart3 size={12} />
        플랫폼별 매출 비중
      </div>
      <div className="flex flex-col gap-2">
        {platforms.map((p, i) => (
          <div key={p.name} className="flex items-center gap-2.5">
            <span className="w-[52px] shrink-0 text-right text-[10px] text-white/40">{p.name}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${p.pct}%` }}
                transition={{ duration: 0.8, delay: 0.6 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full"
                style={{ backgroundColor: p.color }}
              />
            </div>
            <span className="w-7 shrink-0 text-[10px] text-white/30">{p.pct}%</span>
          </div>
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
      {/* ---- Left Panel: 대시보드 프리뷰 ---- */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary md:flex md:w-[55%]">
        {/* 배경 장식 글로우 */}
        <div
          className="pointer-events-none absolute left-[30%] top-[20%] h-[400px] w-[400px]"
          style={{
            background: 'radial-gradient(circle, rgba(56,169,248,0.10) 0%, transparent 70%)',
          }}
        />

        {/* 상단: 로고 */}
        <div className="relative z-10 px-12 pt-10">
          <img src="/riverse_logo.png" alt="RIVERSE" className="h-7" />
        </div>

        {/* 중앙: 대시보드 미니 프리뷰 */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="relative z-10 flex max-w-[480px] flex-col gap-4 px-12"
        >
          {/* KPI 그리드 */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-2.5">
            {kpis.map((kpi) => (
              <MiniKPICard key={kpi.label} {...kpi} />
            ))}
          </motion.div>

          {/* 에어리어 차트 */}
          <motion.div variants={fadeUp}>
            <MiniAreaChart />
          </motion.div>

          {/* 바 차트 */}
          <motion.div variants={fadeUp}>
            <MiniBarChart />
          </motion.div>
        </motion.div>

        {/* 하단: 카피 + 저작권 */}
        <div className="relative z-10 px-12 pb-9">
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
              <label
                htmlFor="email"
                className="mb-1.5 block text-[12px] font-medium text-muted-foreground"
              >
                이메일
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60"
                />
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
              <label
                htmlFor="password"
                className="mb-1.5 block text-[12px] font-medium text-muted-foreground"
              >
                비밀번호
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60"
                />
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

            {/* 에러 메시지 */}
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
