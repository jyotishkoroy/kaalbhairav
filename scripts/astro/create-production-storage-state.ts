import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const storageStatePath =
  process.env.VEDICQA_E2E_STORAGE_STATE ?? "artifacts/auth/production-storage-state.json";

const userDataDir =
  process.env.VEDICQA_CHROME_USER_DATA_DIR ?? "artifacts/auth/chrome-user-data";

await fs.mkdir(path.dirname(storageStatePath), { recursive: true });
await fs.mkdir(userDataDir, { recursive: true });

const context = await chromium.launchPersistentContext(userDataDir, {
  channel: "chrome",
  headless: false,
  viewport: { width: 1440, height: 1000 },
});

const page = context.pages()[0] ?? (await context.newPage());

await page.goto("https://www.tarayai.com/sign-in?next=/astro", {
  waitUntil: "domcontentloaded",
});

console.log("Complete Google login in the opened Chrome window.");
console.log("Waiting for /astro or /astro/setup...");

await page.waitForURL(
  (url) => {
    const pathname = new URL(url.toString()).pathname;
    return pathname === "/astro" || pathname === "/astro/setup";
  },
  { timeout: 180000 },
);

await context.storageState({ path: storageStatePath });

console.log(
  JSON.stringify(
    {
      saved_storage_state: true,
      storageStatePath,
      finalPath: new URL(page.url()).pathname,
    },
    null,
    2,
  ),
);

await context.close();
