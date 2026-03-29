import { type Variants } from 'framer-motion';

// 페이지 전환
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

// 카드 stagger 진입
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

// 경고 카드 슬라이드인
export const alertSlideIn: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

// 차트 바 진입
export const barGrow: Variants = {
  initial: { scaleX: 0 },
  animate: { scaleX: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

// 숫자 카운트업 설정
export const numberSpring = { stiffness: 40, damping: 20, duration: 1.5 };

// 호버 효과
export const hoverLift = {
  whileHover: { y: -3, boxShadow: 'var(--glass-card-hover-shadow)' },
  transition: { duration: 0.2 },
};

// 게이지 바 채움
export const gaugeFill: Variants = {
  initial: { width: '0%' },
  animate: (percent: number) => ({
    width: `${percent}%`,
    transition: { duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 },
  }),
};

// 토스트 알림
export const toastVariants: Variants = {
  initial: { opacity: 0, y: 20, x: 20 },
  animate: { opacity: 1, y: 0, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: 40, transition: { duration: 0.2 } },
};

// 탭 콘텐츠 전환
export const tabContent: Variants = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.15 } },
};

// 펄스 글로우 (드릴다운 하이라이트)
export const pulseGlow = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(59, 111, 246, 0)',
      '0 0 0 8px rgba(59, 111, 246, 0.3)',
      '0 0 0 0 rgba(59, 111, 246, 0)',
    ],
    transition: { duration: 2, repeat: 2 },
  },
};
