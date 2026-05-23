import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

/**
 * Playwright E2E 설정
 *
 * 이 설정은 Chrome 확장을 로드한 상태에서 ThinQ Web을 테스트합니다.
 * 확장은 headed 모드에서만 동작하며, persistent context를 사용합니다.
 *
 * 주의: ThinQ Web은 미사용 30분 후 자동 로그아웃됩니다.
 * 세션이 만료된 경우 `npm run e2e:setup` 으로 재로그인하세요.
 */
export default defineConfig({
  testDir: resolve(__dirname, "e2e"),
  timeout: 300_000, // 5분 — 전체 크롤링이 오래 걸릴 수 있음
  retries: 0,
  workers: 1, // 확장 테스트는 반드시 단일 워커
  use: {
    headless: false, // 확장은 headed 모드 필수
    viewport: { width: 430, height: 932 }, // ThinQ Web 모바일 뷰포트
  },
});
