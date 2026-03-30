# RVJP Sales Dashboard

## 개요
일본 만화 플랫폼 매출 분석 시스템. 속보치 업로드 → DB 적재 → Weekly Report 형식 다운로드.

## 기술 스택
- Frontend: Next.js 16 (App Router) + React 19 + TypeScript
- UI: Tailwind CSS 4 + Framer Motion + Recharts
- Backend: Next.js API Routes → Supabase (PostgreSQL)
- 배포: Vercel (자동 배포, GitHub 연동)

## 폴더 구조
- app/ — 페이지 (9개) + API Routes (36개)
- src/components/ — UI 컴포넌트
- src/lib/ — Supabase 클라이언트, 유틸리티
- src/types/ — TypeScript 타입 정의
- src/utils/ — 비즈니스 로직 (플랫폼 설정, Excel 내보내기)
- scripts/ — 데이터 시딩 스크립트
- supabase/migrations/ — DB 마이그레이션

## 개발
npm run dev — 개발 서버
npm run build — 프로덕션 빌드
npm run lint — ESLint 검사

## 배포
git push origin main → Vercel 자동 빌드+배포
URL: https://rvjp-dashboard.vercel.app

## 환경변수
NEXT_PUBLIC_SUPABASE_URL — Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon key
SUPABASE_SERVICE_ROLE_KEY — (선택) 서버 전용 키
