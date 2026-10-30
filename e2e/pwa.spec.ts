import { expect, test } from "@playwright/test";

test("manifest is installable-shaped", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBeTruthy();
  const m = await res.json();
  expect(m.name).toBeTruthy();
  expect(m.display).toBe("standalone");
  expect(m.start_url).toBeTruthy();
  const sizes = m.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toContain("192x192");
  expect(sizes).toContain("512x512");
  for (const icon of m.icons) expect((await request.get(`/${icon.src}`)).ok()).toBeTruthy();
});

test("app works offline after first visit", async ({ page, context }) => {
  await page.goto("/");
  // Wait until the service worker has installed, precached and controls the page.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }));
    }
  });

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();

  // Client-side navigation and a direct (deep link) load both work offline.
  await page.getByRole("link", { name: /Latihan|Practice/ }).click();
  await expect(page).toHaveURL(/\/practice\/?$/);
  await page.goto("/progress/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await context.setOffline(false);
});
