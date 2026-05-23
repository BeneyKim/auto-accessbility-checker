/**
 * Recon E2E Test
 *
 * 저장된 세션으로 ThinQ Web에 접속하고,
 * 확장의 Recon 모드를 실행하여 DOM 스냅샷을 자동 수집합니다.
 *
 * 사전 조건:
 *   1. `npm run build` 로 확장을 빌드
 *   2. `npm run e2e:setup` 으로 세션 설정 (한 번만)
 *
 * 실행:
 *   npm run e2e:recon
 */

import { test, chromium, type BrowserContext } from "@playwright/test";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const SESSION_DIR = resolve(__dirname, ".session");
const EXTENSION_DIR = resolve(__dirname, "..", "dist");

// ─── Test fixture: persistent context with extension ─────

test.describe("ThinQ Recon Scan", () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    if (!existsSync(SESSION_DIR)) {
      throw new Error(
        "세션 폴더가 없습니다. 먼저 'npm run e2e:setup' 을 실행하여 로그인하세요."
      );
    }
    if (!existsSync(resolve(EXTENSION_DIR, "content.js"))) {
      throw new Error(
        "확장이 빌드되지 않았습니다. 먼저 'npm run build' 를 실행하세요."
      );
    }

    context = await chromium.launchPersistentContext(SESSION_DIR, {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_DIR}`,
        `--load-extension=${EXTENSION_DIR}`,
      ],
      viewport: { width: 430, height: 932 },
      ignoreDefaultArgs: ["--disable-component-extensions-with-background-pages"],
    });

    // Get extension ID from service worker
    let [sw] = context.serviceWorkers();
    if (!sw) {
      sw = await context.waitForEvent("serviceworker", { timeout: 10_000 });
    }
    extensionId = sw.url().split("/")[2];
    console.log("Extension ID:", extensionId);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test("should navigate to ThinQ and run Recon scan", async () => {
    // 1. Navigate to ThinQ
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto("https://my.lgthinq.com/", { waitUntil: "networkidle" });

    // 2. Check if still logged in
    const isLoggedIn = await page.evaluate(() => {
      return !document.body.innerText.includes("로그인") || document.body.innerText.includes("제품");
    });

    if (!isLoggedIn) {
      console.error("⚠️  세션이 만료되었습니다. 'npm run e2e:setup' 으로 재로그인하세요.");
      test.skip();
      return;
    }

    console.log("✅ ThinQ Web 로그인 상태 확인됨");

    // 3. Wait for product page to be ready (allow user to navigate if needed)
    await page.waitForTimeout(3000);

    // 4. Open extension popup in a new page
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForLoadState("domcontentloaded");

    // 5. Click Recon Scan button
    const reconBtn = popupPage.locator("#recon");
    await reconBtn.waitFor({ state: "visible", timeout: 5000 });
    console.log("🔍 Recon Scan 시작...");
    await reconBtn.click();

    // 6. Wait for scan completion (button text changes)
    await popupPage.waitForFunction(
      () => {
        const btn = document.querySelector("#recon");
        return btn && !btn.textContent?.includes("Scanning");
      },
      { timeout: 30_000 }
    );

    console.log("✅ Recon Scan 완료. JSON 파일이 다운로드됩니다.");

    // 7. Wait a moment for download to start
    await popupPage.waitForTimeout(2000);

    // 8. Capture console logs from content script
    const contentLogs: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("[ThinQ-A11y]")) {
        contentLogs.push(msg.text());
      }
    });

    // 9. Take a screenshot for reference
    await page.screenshot({
      path: resolve(__dirname, "screenshots", "recon-result.png"),
      fullPage: false,
    });

    console.log("📸 스크린샷 저장됨: e2e/screenshots/recon-result.png");
    if (contentLogs.length > 0) {
      console.log("📋 Content Script 로그:");
      contentLogs.forEach((log) => console.log("  ", log));
    }
  });
});
