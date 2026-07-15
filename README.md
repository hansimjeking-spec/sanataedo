# 제천종합사회복지관 사례관리팀 업무도구

기존 대상자·사업실적 도구에 사례관리 전 과정과 편집 가능한 가계도·생태도를 통합한 버전입니다. 가계도 자료는 사용자가 연결한 Google Drive에 저장할 수 있습니다.

## 주요 기능

- 접수 → 초기상담 → 사정 → 선정 → 계획 → 개입 → 점검 → 종결 → 사후관리
- 욕구영역별 사정, 목표·지표·달성률, 서비스·외부기관 의뢰, 사례회의·슈퍼비전
- 재사정·목표·서비스 종료·사후관리 기한 알림
- Google OAuth 기반 개인 Google Drive 연결 및 대상자별 가계도 저장
- 브라우저 로컬 저장과 JSON 백업·복원
- 대상자·가구원 정보에서 가계도 초안 자동 생성 후 생태자원과 관계 편집

## 배포 전 준비

1. Google Cloud Console에서 Google Drive API를 활성화합니다.
2. 웹 애플리케이션 OAuth 클라이언트를 만들고 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `GOOGLE_SESSION_SECRET`을 Vercel에 추가합니다.
3. OAuth redirect URI는 `https://gagyedo-ecomap.vercel.app/api/google-auth?action=callback`으로 등록합니다.
4. 필요하면 `GOOGLE_DRIVE_FOLDER_ID`를 지정해 저장 폴더를 고정합니다. 지정하지 않으면 앱이 개인 Drive에 `가계도 대상자` 폴더를 만듭니다.
5. `pnpm install` 후 `pnpm check && pnpm test`를 통과시킵니다.
6. 운영 화면에서 Google Drive 연결 → 대상자 저장 → 저장 목록에서 불러오기를 확인합니다.

## 개인정보 운영 전 필수 확인

- 복지관 개인정보 처리방침·내부관리계획 반영
- 클라우드 처리위탁 및 국외이전 해당 여부 검토와 필요한 고지·동의
- 직원별 최소 권한, 퇴직·전보 시 즉시 권한 말소 절차
- 접속기록 점검 주기, 보유·파기 기간, 유출사고 대응 절차
- 실제 자료 전환 전 가명 시험자료로 인수테스트와 직원 교육

기관 검토가 끝나기 전에는 화면 상단의 시험 운영 안내를 유지하고 실제 개인정보를 입력하지 않습니다.
