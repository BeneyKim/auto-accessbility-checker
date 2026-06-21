# ThinQ Web IBM Accessibility Checker

ThinQ Web IBM Accessibility Checker는 ThinQ Web 제품 상세 화면을 자동 탐색하고 IBM Equal Access 접근성 검사를 수행하는 Chrome/Edge Manifest V3 확장앱입니다.

이 프로젝트는 Gemini 3.5 Flash (High)에 의해 개발되었습니다.

## Features

- `https://my.lgthinq.com/`의 제품 상세 화면에서 실행
- 제품 탭, 유용한 기능 탭, 설정 화면을 기준으로 depth 제한 DFS 탐색
- ThinQ PLAY, 닫기, 홈 이동, 단순 ON/OFF switch 조작 방지
- 활성/비활성 탭 자동 감지 및 비활성 영역 자동 수집 제외
- DOM 기반 동적 목록/검색 화면 판별 (`isDynamicListOrSearchPage`) 및 활성 탭 명칭 결합 세맨틱 캐시
- Shadow DOM 지원 및 `shadowContains` 헬퍼를 활용한 조상 6레벨 이내 카드 레이아웃 중복 클릭 방지
- 스마트진단 오진입 방지를 위한 8단계 조상 깊이 차단 및 sds/sds_diagnosis 필터
- `<all_urls>` 권한 기반 MV3 환경에서의 안정적인 스크린샷 캡쳐 및 레포트 ZIP 다운로드
- 각 화면별 IBM Equal Access 검사, 스크린샷, depth/menu path 기록
- JSON, Markdown, HTML 결과서 다운로드
- 설정 저장: title, accessibility standard, rule set, depth


## Development

```powershell
npm.cmd install
npm.cmd run verify
```

PowerShell 실행 정책 때문에 `npm`이 막히는 환경에서는 `npm.cmd`를 사용합니다.

## Load Extension

1. `npm.cmd run build`를 실행합니다.
2. Chrome 또는 Edge에서 Extensions 페이지를 엽니다.
3. Developer mode를 켭니다.
4. Load unpacked를 선택하고 `dist` 폴더를 지정합니다.
5. `https://my.lgthinq.com/`에 접속해 로그인하고 제품 상세 화면으로 진입합니다.
6. 확장앱 popup에서 설정을 확인한 뒤 Start를 누릅니다.
7. ThinQ 화면 전환으로 콘솔 로그가 사라지면 popup의 Download debug log 버튼으로 실행 로그 JSON을 다운로드합니다.

## Reports

완료 후 Download report 버튼을 누르면 다음 파일이 다운로드됩니다.

- `{title}-{yyyyMMdd-HHmmss}.json`
- `{title}-{yyyyMMdd-HHmmss}.md`
- `{title}-{yyyyMMdd-HHmmss}.html`
- `{title}-debug-log-{yyyyMMdd-HHmmss}.json`

## Notes

- IBM Equal Access 엔진은 CDN이 아니라 확장 패키지 내부의 `vendor/ace.js`로 번들링합니다.
- Polarion ALM 등록은 사내망 환경에서 후속 구현하도록 인터페이스와 문서만 준비되어 있습니다.
