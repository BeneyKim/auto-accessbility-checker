/**
 * ThinQ Web 세션 설정 스크립트
 *
 * 이 스크립트는 한 번만 실행하면 됩니다.
 * Chrome 브라우저가 열리면 ThinQ Web에서 구글 로그인을 수동으로 완료하세요.
 * 로그인 후 브라우저를 닫으면 세션이 ./e2e/.session 폴더에 저장됩니다.
 *
 * 주의: ThinQ Web은 미사용 30분 후 자동 로그아웃됩니다.
 * 세션이 만료된 경우 이 스크립트를 다시 실행하세요.
 *
 * 사용법:
 *   npm run e2e:setup
 */

import { chromium } from "@playwright/test";
import { resolve } from "node:path";

const SESSION_DIR = resolve(__dirname, ".session");
const EXTENSION_DIR = resolve(__dirname, "..", "dist");

async function setupSession(): Promise<void> {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  ThinQ Web 세션 설정");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");
  console.log("  1. 브라우저가 열리면 https://my.lgthinq.com/ 에 접속합니다.");
  console.log("  2. '구글로 로그인' 버튼을 눌러 로그인을 완료하세요.");
  console.log("  3. 제품 화면까지 진입한 후 브라우저를 닫아주세요.");
  console.log("");
  console.log("  세션 저장 경로:", SESSION_DIR);
  console.log("  확장 로드 경로:", EXTENSION_DIR);
  console.log("");
  console.log("  ⚠️  ThinQ는 미사용 30분 후 자동 로그아웃됩니다.");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");

  const context = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_DIR}`,
      `--load-extension=${EXTENSION_DIR}`,
      "--start-maximized",
    ],
    viewport: null, // maximized 사용
    ignoreDefaultArgs: ["--disable-component-extensions-with-background-pages"],
  });

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("https://my.lgthinq.com/");

  console.log("브라우저가 열렸습니다. 로그인을 완료하고 브라우저를 닫아주세요...");

  // 브라우저가 닫힐 때까지 대기
  await new Promise<void>((resolve) => {
    context.on("close", () => resolve());
  });

  console.log("");
  console.log("✅ 세션이 저장되었습니다:", SESSION_DIR);
  console.log("   이제 'npm run e2e:recon' 또는 'npm run e2e' 로 자동 테스트를 실행할 수 있습니다.");
}

setupSession().catch((error) => {
  console.error("세션 설정 실패:", error);
  process.exit(1);
});
