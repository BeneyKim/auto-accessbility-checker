# PLAN

## Current Status

- [x] Project scaffold for Chrome/Edge MV3 extension
- [x] Popup settings, start/stop, status, download controls
- [x] Background service worker for run orchestration, screenshots, downloads
- [x] Content script traversal engine with generic ThinQ heuristics
- [x] ThinQ branch activation explicitly clicks product/useful-features/settings controls
- [x] Traversal ignores transient background-only refresh layers
- [x] Traversal state machine with navigation stack, transition classification, and fail-closed recovery
- [x] Bottom sheet/overlay screens are treated as terminal leaf screens after IBM check
- [x] Unsafe transitions abort without auto-recovery clicks; internal ThinQ route screens use a route shell fallback
- [x] Home dashboard, popup close, and refresh controls are blocked from route child candidates
- [x] Same-screen period tab variants are scanned without increasing depth
- [x] Period paging controls are skipped as state controls
- [x] Date/year picker bottom sheets use terminal overlay handling without arbitrary option clicks
- [x] Missing content-script receiving end is recovered by script injection and retry
- [x] IBM Equal Access page runner injection
- [x] JSON, Markdown, HTML report generation
- [x] Unit tests for candidate filtering and report generation
- [ ] Real ThinQ Web login/session validation
- [ ] Product test pass: air purifier
- [ ] Product test pass: dehumidifier
- [ ] Product test pass: refrigerator
- [ ] Product test pass: air conditioner
- [ ] Product test pass: water purifier
- [ ] Product test pass: dishwasher
- [ ] Product test pass: WashTower
- [ ] Corporate network Polarion follow-up implementation

## Implementation TODO

- Verify real ThinQ DOM selectors after login.
- Continue air purifier validation with debug logs after terminal bottom-sheet and internal route handling.
- Tune blocked navigation heuristics if a product page exposes unnamed icon buttons.
- Add waiver settings UI after baseline MVP validation.
- Add Polarion REST publisher in a corporate-network Codex session.

## Git Workflow

- Commit meaningful implementation chunks.
- Push to `https://github.com/BeneyKim/auto-accessbility-checker.git` after each meaningful chunk when remote access is available.
