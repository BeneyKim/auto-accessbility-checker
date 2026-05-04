# DESIGN

## Architecture

The extension uses Manifest V3 and is split into three execution contexts.

- Popup: settings, start/stop controls, status, download action
- Background service worker: active tab validation, run status, screenshot capture, report downloads
- Content script: ThinQ DOM traversal, screen metadata extraction, IBM check requests

IBM Equal Access is bundled into the extension as `vendor/ace.js`. The content script injects `ibmRunner.js` into the page context and passes the extension URL for `ace.js`. The runner executes `new ace.Checker().check(document, [policy])` and returns the raw JSON report through `window.postMessage`.

## Traversal Decisions

- Traversal starts only when product tab, useful features tab, and settings button are all visible.
- The product shell is detected from the largest visible dialog/modal-like region, falling back to `document.body`.
- The traversal root branches are product, useful features, and settings.
- Each branch uses DFS until the configured max depth.
- A screen is considered visited by `branch + menuPath + screenSignature`.
- Screen signature includes URL, selected tab, headings, modal count, and normalized visible text.
- Buttons that look like ThinQ PLAY, close, home, branch tabs, or switch/toggle controls are skipped.
- After each child screen, the extension tries to restore the previous screen by using an in-shell back button or Escape.
- Browser history is intentionally avoided to reduce the risk of returning to Home.

## Data Model

Each screen result contains:

- `depth`
- `menuPath`
- `branch`
- `title`
- `url`
- `timestamp`
- `screenshot`
- `ibmReport`
- `summary`
- `navigation`

The JSON report is the source of truth. Markdown and HTML are generated from the JSON structure.

## Waiver Extension Point

Waiver support is prepared in `src/shared/waiver.ts`.

Future settings should allow multiple regex rules. A waiver rule should match across:

- `ruleId`
- `reasonId`
- message
- xpath or CSS selector
- accessible name
- menu path

The JSON source should preserve waived findings with `waived: true` and `waiverRuleId`. Markdown, HTML, and Polarion publishing should exclude waived findings.

## Polarion Extension Point

Polarion ALM publishing is intentionally deferred because the current PC cannot access the corporate network.

The interface is prepared in `src/shared/polarion.ts`. A future corporate-network implementation should add:

- endpoint configuration
- authentication strategy
- IBM finding to Polarion work item mapping
- duplicate detection
- waiver exclusion before publish
- dry-run mode

This follow-up is intended to be implemented later with ChatGPT Business License Codex inside the corporate environment.
