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
- [x] Date picker dropdown triggers are collected across period tabs when a date/year label has a chevron/down affordance
- [x] Graph X-axis/touchframe controls are skipped while keeping the chart in the current-screen accessibility scan
- [x] Date picker modal overlays are restored with close/Escape and no cascading parent back after abort
- [x] Generated-class picker modals with cancel/confirm and year/month/day values are detected as terminal overlays
- [x] Restore back/close controls use a single native click path to avoid repeated app back navigation
- [x] Deep product route screens scan only local tabs/date pickers and stop safely instead of auto-back restoring
- [x] Large static composite chart/date containers are skipped as candidates
- [x] Missing content-script receiving end is recovered by script injection and retry
- [x] IBM Equal Access page runner injection
- [x] JSON, Markdown, HTML report generation
- [x] Unit tests for candidate filtering and report generation
- [x] DOM-based List/Search classification (isDynamicListOrSearchPage) to resolve history page loop and search page bypass
- [x] Active tab name binding to semanticLayoutKey to partition history tab caches
- [x] Pre-filtering of Smart Diagnosis entry points by expanding ancestor search depth to 8 levels
- [x] Shadow DOM traversal support for shadowContains and isAriaHidden
- [x] Nesting deduplication with text tag filtering up to 6 levels of ancestor group
- [x] Restored stable screenshot capturing via <all_urls> permission
- [ ] Real ThinQ Web login/session validation
- [x] Product test pass: air purifier
- [ ] Product test pass: dehumidifier
- [x] Product test pass: refrigerator
- [ ] Product test pass: air conditioner
- [ ] Product test pass: water purifier
- [x] Product test pass: dishwasher
- [x] Product test pass: WashTower
- [ ] Corporate network Polarion follow-up implementation


## Implementation TODO

- Add waiver settings UI after baseline MVP validation.
- Add Polarion REST publisher in a corporate-network Codex session.
- Monitor DOM structure of other appliances (styler, water purifier, etc.) during traversal.


## Git Workflow

- Commit meaningful implementation chunks.
- Push to `https://github.com/BeneyKim/auto-accessbility-checker.git` after each meaningful chunk when remote access is available.
