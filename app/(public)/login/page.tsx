'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, TrendingUp } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

// ---------------------------------------------------------------------------
// 플랫폼 아이콘 목록
// ---------------------------------------------------------------------------
const platformIcons = [
  { src: '/icons/piccoma.png', name: 'Piccoma' },
  { src: '/icons/mechacomic.png', name: 'Mechacomic' },
  { src: '/icons/cmoa.png', name: 'cmoa' },
  { src: '/icons/linemanga.png', name: 'LINEマンガ' },
  { src: '/icons/ebookjapan.jpg', name: 'ebookjapan' },
  { src: '/icons/fanza.png', name: 'FANZA' },
  { src: '/icons/renta.png', name: 'Renta!' },
  { src: '/icons/unext.png', name: 'U-NEXT' },
  { src: '/icons/dmm.png', name: 'DMM' },
  { src: '/icons/mangaoukoku.jpeg', name: 'まんが王国' },
];

// 3열 무한 스크롤용 배열 (2세트 반복)
const col1 = [...platformIcons.slice(0, 4), ...platformIcons.slice(0, 4)];
const col2 = [...platformIcons.slice(4, 7), ...platformIcons.slice(4, 7)];
const col3 = [...platformIcons.slice(7, 10), ...platformIcons.slice(7, 10)];

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
      {/* ---- Left Panel: 리버스 네이비 + 반투명 아이콘 스크롤 ---- */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden md:flex md:w-[55%]"
        style={{ background: '#1A2B5E' }}
      >
        {/* 배경: 아이콘 스크롤 (전체 패널에 깔림, 매우 반투명) */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
          <div className="flex gap-10">
            {/* 열 1: 위로 스크롤 */}
            <div className="relative h-full w-[280px] overflow-hidden" style={{ height: '100vh' }}>
              <motion.div
                className="flex flex-col gap-10"
                animate={{ y: [0, -1520] }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              >
                {col1.map((icon, i) => (
                  <div key={`c1-${i}`} className="w-[280px] h-[280px] flex items-center justify-center p-8">
                    <img src={icon.src} alt={icon.name} className="w-full h-full object-contain" style={{ opacity: 0.08 }} />
                  </div>
                ))}
              </motion.div>
            </div>

            {/* 열 2: 아래로 스크롤 */}
            <div className="relative h-full w-[280px] overflow-hidden" style={{ height: '100vh' }}>
              <motion.div
                className="flex flex-col gap-10"
                initial={{ y: -800 }}
                animate={{ y: [-800, 0] }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
              >
                {col2.map((icon, i) => (
                  <div key={`c2-${i}`} className="w-[280px] h-[280px] flex items-center justify-center p-8">
                    <img src={icon.src} alt={icon.name} className="w-full h-full object-contain" style={{ opacity: 0.08 }} />
                  </div>
                ))}
              </motion.div>
            </div>

            {/* 열 3: 위로 스크롤 (느리게) */}
            <div className="relative h-full w-[280px] overflow-hidden" style={{ height: '100vh' }}>
              <motion.div
                className="flex flex-col gap-10"
                animate={{ y: [0, -1520] }}
                transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
              >
                {col3.map((icon, i) => (
                  <div key={`c3-${i}`} className="w-[280px] h-[280px] flex items-center justify-center p-8">
                    <img src={icon.src} alt={icon.name} className="w-full h-full object-contain" style={{ opacity: 0.08 }} />
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>

        {/* 상단: 로고 */}
        <div className="relative z-10 px-12 pt-10">
          <img src="/riverse_logo.png" alt="RIVERSE" className="h-7" style={{ filter: 'brightness(0) invert(1)' }} />
        </div>

        {/* 중앙: 빈 공간 (아이콘이 배경으로 깔림) */}
        <div className="flex-1" />

        {/* 하단: 카피 + 저작권 */}
        <div className="relative z-10 px-12 pb-9">
          <h1 className="mb-2.5 text-[28px] font-bold leading-[1.4] text-white/90">
            데이터로 보는
            <br />
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>매출의 모든 것</span>
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
