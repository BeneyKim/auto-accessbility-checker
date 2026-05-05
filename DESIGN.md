# DESIGN

## Architecture

The extension uses Manifest V3 and is split into three execution contexts.

- Popup: settings, start/stop controls, status, download action
- Background service worker: active tab validation, run status, screenshot capture, report downloads
- Content script: ThinQ DOM traversal, screen metadata extraction, IBM check requests

IBM Equal Access is bundled into the extension as `vendor/ace.js`. The content script injects `ibmRunner.js` into the page context and passes the extension URL for `ace.js`. The runner executes `new ace.Checker().check(document, [policy])` and returns the raw JSON report through `window.postMessage`.

## Traversal Decisions

- Traversal starts only when product tab, useful features tab, and settings button are all visible.
- The product boundary is detected from the ThinQ body/app shell and is never allowed to fall back to `document.body`; background-only image layers are ignored.
- The traversal root branches are product, useful features, and settings, and each branch starts only after the matching tab/settings control is activated and verified.
- Traversal is a state machine with `ROOT_BRANCH`, `CLICK_PENDING`, `CHILD_OPEN`, `RESTORE_PENDING`, `BRANCH_RECOVERY`, and `ABORTED` states.
- Depth is tracked by a `navigationStack`; a screen is considered visited by `branch + menuPath + screenSignature`.
- Screen signature includes URL, selected tab, headings, modal count, and normalized visible text.
- A click is classified as `no-change`, `state-change`, `overlay-opened`, `in-product-child`, `branch-changed`, `out-of-scope`, `home-navigation`, or `unknown`.
- Transition classification waits up to 15 seconds and returns only after a non-`no-change` safe state is stable for 700 ms; transient loading states apply to every candidate, not one feature.
- Candidate activation targets the element under the click center and dispatches touch, pointer, mouse, native click, and keyboard fallback when the primary click produces no change.
- Product controls disappearing is unsafe by default. It is not scanned as a child screen unless a safe product boundary or overlay is still present.
- `overlay-opened` and `in-product-child` push depth; restore runs in a `finally` block before the next candidate is collected.
- `overlay-opened` screens, including ThinQ bottom sheets, are terminal leaf screens: the extension scans the overlay once, skips all inner picker/button candidates, and closes it with an explicit close/cancel button or the first visible overlay button.
- Buttons that look like ThinQ PLAY, close, home, branch tabs, or switch/toggle controls are skipped.
- Restore order is overlay close, in-shell back, Escape, then branch root re-entry.
- If restoration cannot prove the previous screen signature, the run is aborted with a failure result instead of continuing from a stale screen.
- Browser history is not used for restoration because it can return to Home on ThinQ Web.

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
