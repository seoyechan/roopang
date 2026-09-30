# 월급루팡

```bash
npm i
npm run dev      # 개발 서버
npm run check    # 계산·보상 규칙 셀프체크
npm run build    # dist/ 생성 (정적 호스팅에 그대로 업로드)
```

## 방문자 확인 (Google Analytics 4)

1. https://analytics.google.com → 관리 → 속성 만들기 → 웹 데이터 스트림 추가 → 측정 ID(`G-...`) 복사
2. 프로젝트 루트에 `.env` 파일 생성: `VITE_GA_ID=G-XXXXXXXXXX` (배포 서비스라면 환경 변수로 등록)
3. `npm run build` 후 배포. GA의 보고서 → 실시간에서 방문자 확인

기본 페이지뷰 외에 `lupang_start`, `lupang_end`, `reward`, `session_delete` 이벤트를 보냅니다. ID가 없으면 GA는 로드되지 않습니다.
