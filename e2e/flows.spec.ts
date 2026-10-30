import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// Core flows end to end: daily session → progress, practice, export/import, settings.

test("daily session records attempts that show up in Progress", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Mulai sesi harian|Start daily session/ }).click();
  await expect(page.getByText(/Soal 1 dari|Question 1 of/)).toBeVisible();

  // Answer by revealing the solution (works for every format) for two questions.
  for (let i = 0; i < 2; i++) {
    const heading = page.getByRole("heading", { level: 2 });
    await expect(heading).toBeVisible();
    page.once("dialog", (d) => d.accept());
    const solution = page.getByRole("button", { name: /Lihat solusi|Show solution/ });
    if (await solution.isVisible()) {
      await solution.click();
    } else {
      // Flashcard: reveal and grade.
      await page.getByRole("button", { name: /Tampilkan jawaban|Show answer/ }).click();
      await page.getByRole("button", { name: /^(Bisa|Good)$/ }).click();
    }
    await page.getByRole("button", { name: /^(Lanjut|Next|Selesai|Finish)$/ }).click();
  }

  await page.goto("/progress/");
  await expect(page.getByRole("heading", { name: /Riwayat terakhir|Recent history/ })).toBeVisible();
  await expect(page.locator("section").filter({ hasText: /Riwayat|history/ }).locator("li")).toHaveCount(2);

  // Home offers to continue the unfinished daily session.
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Lanjutkan sesi|Continue session/ })).toBeVisible();
});

test("practice: pick track and level, start a session", async ({ page }) => {
  await page.goto("/practice/");
  await page.getByRole("button", { name: /JavaScript/ }).click();
  await page.getByRole("link", { name: /Mulai latihan|Start practice/ }).click();
  await expect(page).toHaveURL(/session/);
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  await expect(page.getByText("javascript", { exact: true })).toBeVisible();
});

test("export then import progress (replace)", async ({ page }) => {
  // Create one attempt.
  await page.goto("/session/?q=js-types-001");
  await page.getByRole("radio", { name: /"object"/ }).click();
  await page.getByRole("button", { name: /^(Cek|Check)$/ }).click();
  await page.getByRole("button", { name: /^(Selesai|Finish)$/ }).click();

  await page.goto("/settings/");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Ekspor progres|Export progress/ }).click(),
  ]);
  const path = await download.path();
  const backup = JSON.parse(readFileSync(path, "utf8"));
  expect(backup.app).toBe("programming-hub");
  expect(backup.attempts).toHaveLength(1);

  // Reset, then restore from the file.
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Reset semua progres|Reset all progress/ }).click();
  await expect(page.getByText(/Progres dihapus|Progress deleted/)).toBeVisible();
  await page.goto("/progress/");
  await expect(page.getByText(/Belum ada riwayat|No history yet/)).toBeVisible();

  await page.goto("/settings/");
  await page.getByRole("radio", { name: /Ganti semua|Replace all/ }).click();
  await page.locator('input[type="file"]').setInputFiles(path);
  await expect(page.getByText(/Impor berhasil|Import complete/)).toBeVisible();
  await page.goto("/progress/");
  await expect(page.getByText("Hasil typeof null")).toBeVisible();
});

test("settings: theme and language persist", async ({ page }) => {
  await page.goto("/settings/");
  await page.getByRole("radio", { name: "Terang" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("radio", { name: "English" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});
