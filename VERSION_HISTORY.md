# ThinQ Web IBM Accessibility Checker Version History

## v0.99 (2026-05-24)
- **Zero-Base Traversal Engine Redesign (Phase 1-6) 완료**
- **Recon Mode (사전 탐색 도구)**:
  - 페이지를 직접 클릭해 들어가지 않고 현재 화면의 모든 인터랙티브 및 비인터랙티브 요소를 진단하고 추출할 수 있는 Recon Scan 기능 추가.
- **금지 버튼 레지스트리 (Forbidden Registry)**:
  - 22개의 비정상 경로/외부 서비스 이탈 금지 규칙을 관리할 수 있는 전용 레지스트리 모듈 도입.
  - 소모품 정보, 가전세척 신청, 스마트 진단, ThinQ PLAY, 스마트 루틴, 이전 날/달 등의 비정상 루프 유발 제어 장치 추가.
- **Playwright E2E 자동화 파이프라인**:
  - 구글 세션 로그인 저장 스크립트 및 자동으로 페이지를 로드하여 Recon 데이터 스캔을 수행하는 Playwright spec 추가.
- **다중 복구 및 셀프 힐링 (Self-Healing Restore)**:
  - 뒤로가기 버튼 정규식 완화 및 `document.body` 전역 검출로 ThinQ SPA 쉘 외부 뒤로가기 대응.
  - 복합 복구 로직(`overlay-close` -> `Escape` -> `back-button` -> `history-back` -> `tab-reentry`) 구축.
  - 동일한 타이틀을 가진 미지원 기능 알럿 경고창 등의 복구 예외를 판정하기 위해 `verifyRestore` 내에 오버레이 개수 비교 가드 추가.
  - 알럿 팝업 닫기용 `"확인/OK"` 폴백 클릭 기능 구현.
- **성능 최적화**:
  - 클릭 무반응 요소 및 이미 활성화된 탭 클릭 시 대기 시간을 6초에서 1.8초로 단축 (`NO_CHANGE_STABLE_MS`).
  - 비인터랙티브 요소(일반 div 등)에 대한 키보드 retry 생략으로 탐색 지연 최소화.
- **A11y 대시보드 리포터**:
  - 기존 33MB 분량의 raw JSON 출력 테이블을 획기적으로 개선하여, PASS 결과를 생략한 2~3MB 수준의 가볍고 빠른 반응형 대시보드 구현.
  - 좌측 스크린 리스트 사이드바(이슈 개수별 배지 표기) 및 실시간 검색 필터 제공.
  - 스크린샷 뷰포트 정합 배치 및 클릭 시 전체 화면 확대 모달(Lightbox) 기능 추가.
