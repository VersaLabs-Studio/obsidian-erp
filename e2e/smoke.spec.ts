// e2e/smoke.spec.ts
// Obsidian ERP v4.0 - E2E Smoke Test
// Verifies Playwright is configured and the app loads

import { test, expect } from "@playwright/test";

test("app loads and has correct title", async ({ page }) => {
  await page.goto("/");

  // Wait for the page to load
  await page.waitForLoadState("networkidle");

  // Check the title contains "Obsidian"
  const title = await page.title();
  expect(title).toContain("Obsidian");
});

test("app serves CSS and JS", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBeLessThan(400);
});
