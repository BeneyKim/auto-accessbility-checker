# TEST

## Automated Tests

Run:

```powershell
npm.cmd run verify
```

Latest local verification:

- 2026-05-07: `npm.cmd run verify` passed. Vitest: 3 files, 22 tests. Build output refreshed in `dist/`.

Current automated coverage:

- Required ThinQ controls detection
- Custom div-based bottom tabs and unnamed top-right settings icon detection
- ThinQ footer `data-name="prodMainTabbar"` tab detection when the tabbar is outside the product body
- ThinQ `body_container` is used as the product shell when app body and footer are siblings
- Branch entry uses freshly resolved controls and verifies the active branch before scanning
- Branch controls are activated with focus, pointer, mouse, and click so ThinQ tab/settings controls are actually pressed
- Background-only layers such as `background_img_container` are not selected as traversal shells
- `document.body` is not exposed as the product boundary
- ThinQ custom `data-nscreenfocusable` rows are collected as navigation candidates
- Fan-speed value controls are candidates again; carousel previous/next controls are skipped as state-only controls
- Parent rows that contain switch-like controls, such as sleep reservation rows, are candidates when the row itself is actionable
- The traversal skips candidates already present in the current menu path to avoid repeated self-entry
- Screen signatures use structural signals instead of full visible text to avoid treating value changes as new screens
- Candidate transitions are classified as no-change, state-change, overlay, product child, branch change, out-of-scope, home, or unknown
- Candidate transitions wait up to 6 seconds and require a safe non-no-change state to be stable for 700 ms
- Unsafe transitions return after 1.2 seconds of stability and abort without auto-recovery clicks
- ThinQ internal `GPM-20` route child screens can use a route shell fallback without using generic `document.body` as the product boundary
- Candidate activation uses center hit-target touch/pointer/mouse/native click plus keyboard fallback after no-change
- Bottom sheet and overlay screens are scanned as terminal leaf screens; inner picker/buttons such as fan-speed up/down are not traversed as child candidates
- Same-screen period tabs such as `1일`, `1주`, `1개월`, and `1년` are scanned at the current depth without pushing a child frame
- Date/year picker triggers such as `2025년`, `2026년`, and `2026년 5월 7일 목` are not same-depth tabs. When they expose a dropdown affordance and open a bottom sheet, they are scanned as terminal overlays.
- Period paging controls such as `이전 연도`, `다음 연도`, `이전 월`, and `다음 주` are skipped as state controls
- Chart X-axis/touchframe controls are skipped as `chart-data-control`
- Large static composite containers around chart/date content are skipped as `static-composite-container`
- Product-detail screens where the root boundary disappears are treated as unsafe, not as child screens
- The traversal refuses to scan `document.body` as a child screen when the product shell disappears during refresh/navigation
- The traversal waits through transient background-only refresh layers and does not count them as navigable child screens
- Depth transitions are logged as `depth pushed` and `depth popped`, and restore runs in a `finally` block after child scanning
- Candidate filtering for ThinQ PLAY, close, branch tabs, and switches
- Candidate filtering for ThinQ Home dashboard navigation, popup/window close, and refresh/reload controls
- Screen title extraction ignores blocked global navigation headings
- Screen signature change detection
- IBM summary extraction
- JSON, Markdown, HTML report generation
- Safe report file names

## Manual Acceptance Criteria

- Start is blocked when product tab, useful features tab, or settings icon is missing.
- Traversal does not navigate back to ThinQ Home.
- Traversal does not click ThinQ PLAY.
- Traversal does not click X or close controls.
- Traversal does not operate ON/OFF-only switches.
- Traversal does not repeatedly scan the same screen.
- Completion returns to the product tab when the product root remains available.
- JSON, Markdown, and HTML reports download successfully.
- Debug log JSON downloads from the popup even when page console logs are lost during ThinQ refresh/navigation.
- Candidate transition classifications are logged with snapshot details to diagnose missed bottom sheets or detail pages.
- IBM reports that contain DOM node references are sanitized before crossing `postMessage`.
- If IBM check fails on one screen, the run records an error report for that screen and continues.
- IBM checks are scoped to the current ThinQ screen shell and captured ACE rule exceptions are stored in report metadata.
- Back/home navigation controls are blocked from normal traversal candidates.
- Restore attempts use overlay close, Escape, in-shell back controls, and branch root re-entry; browser history is not used.
- Date picker modal restore does not use in-overlay back controls, and failed child restore stops parent restore from cascading further back.
- Restore controls use a single native click path instead of the candidate activation sequence to avoid repeated app back navigation.
- Generated-class picker modals with cancel/confirm and year/month/day values are detected as overlays even without explicit modal/sheet class names.
- Back controls are searched only inside the current safe shell, not across the whole document.
- Bottom sheets are closed after their IBM check by pressing an explicit close/cancel/dismiss button or Escape.
- If `START_RUN` fails because the content script receiving end does not exist, the background injects `content.js` and retries.
- Runtime log/screenshot/completion messages from the content script tolerate missing receivers and do not crash traversal.
- Overlay restore does not click arbitrary picker options when no explicit close/cancel button exists.
- If restore cannot return to the previous signature, the run aborts with a failure result instead of clicking stale elements from the wrong screen.
- If the page context cannot resolve the current-shell IBM selector, IBM check falls back to `document` and records `targetFound: false`.
- Screenshots are captured as compressed JPEG to reduce report payload size.

## Real Product Test Matrix

| Product | Date | Depth | Result | Screens | Violations | Notes |
| --- | --- | ---: | --- | ---: | ---: | --- |
| Air purifier | Not run | 5 | Pending | 0 | 0 | Requires ThinQ login |
| Dehumidifier | Not run | 5 | Pending | 0 | 0 | Requires ThinQ login |
| Refrigerator | Not run | 5 | Pending | 0 | 0 | Requires ThinQ login |
| Air conditioner | Not run | 5 | Pending | 0 | 0 | Requires ThinQ login |
| Water purifier | Not run | 5 | Pending | 0 | 0 | Requires ThinQ login |
| Dishwasher | Not run | 5 | Pending | 0 | 0 | Requires ThinQ login |
| WashTower | Not run | 5 | Pending | 0 | 0 | Requires ThinQ login |

## Known Manual Validation Need

Real ThinQ Web DOM structure must be checked after login. If icon buttons lack accessible names, detection should be tuned with geometry and stable DOM attributes without adding product-specific behavior.
