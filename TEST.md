# TEST

## Automated Tests

Run:

```powershell
npm.cmd run verify
```

Current automated coverage:

- Required ThinQ controls detection
- Custom div-based bottom tabs and unnamed top-right settings icon detection
- ThinQ footer `data-name="prodMainTabbar"` tab detection when the tabbar is outside the product body
- ThinQ custom `data-nscreenfocusable` rows are collected as navigation candidates
- Candidate filtering for ThinQ PLAY, close, branch tabs, and switches
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
- Completion returns to the product tab.
- JSON, Markdown, and HTML reports download successfully.
- IBM reports that contain DOM node references are sanitized before crossing `postMessage`.
- If IBM check fails on one screen, the run records an error report for that screen and continues.

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
