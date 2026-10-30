import { expect, test } from "@playwright/test";

// 360px is the narrowest common Android width. No screen may scroll sideways.
const routes = [
  "/",
  "/practice/?track=javascript",
  "/cards/",
  "/progress/",
  "/settings/",
  "/desktop/",
  "/session/?q=js-loops-001",
  "/session/?q=js-loops-002",
  "/session/?q=sql-select-001",
];

test.use({ viewport: { width: 360, height: 740 } });

for (const route of routes) {
  test(`no horizontal overflow at 360px: ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(360);
  });
}

test("tab bar targets are at least 44px tall", async ({ page }) => {
  await page.goto("/");
  const links = page.getByRole("navigation", { name: "Main" }).getByRole("link");
  for (const box of await links.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
    expect(box).toBeGreaterThanOrEqual(44);
  }
});
