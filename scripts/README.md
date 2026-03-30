# 데이터 시드 스크립트

## 사용법

### seed-full-master.ts
통합 작품 리스트 Excel에서 모든 작품 정보를 DB에 시딩합니다.
- 입력: RIVERSE_統合コンテンツリスト.xlsx (4개 시트)
- 출력: titles, production_companies, genres, labels, title_platform_availability 테이블
- 실행: `npx tsx scripts/seed-full-master.ts`

### seed-v2.ts
주간 매출 리포트 Excel을 daily_sales_v2 테이블에 적재합니다.
- 입력: [RVJP-RVKR] Weekly Report.xlsx
- 실행: `npx tsx scripts/seed-v2.ts`

### seed-genres.ts
장르 데이터를 Excel에서 추출하여 시딩합니다.
- 실행: `npx tsx scripts/seed-genres.ts`

### seed-production-companies.ts
제작사 데이터를 Excel에서 추출하여 시딩합니다.
- 실행: `npx tsx scripts/seed-production-companies.ts`

### seed-supabase.ts
초기 DB 구조 생성 및 기초 데이터 시딩 (1회용).
- 실행: `npx tsx scripts/seed-supabase.ts`

### check-channels.ts
DB의 채널명 일관성을 확인하는 유틸리티.
- 실행: `npx tsx scripts/check-channels.ts`

### convert_excel.py
Excel 파일 변환 유틸리티 (Python).
- 실행: `python scripts/convert_excel.py`
