import { expect, test, type Page } from "@playwright/test";

// One sample per question format, answered correctly through the real UI.

async function open(page: Page, id: string) {
  await page.goto(`/session/?q=${id}`);
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
}

async function expectCorrect(page: Page) {
  await expect(page.getByText(/✓ (Benar|Correct)/)).toBeVisible({ timeout: 15_000 });
}

test("multiple-choice", async ({ page }) => {
  await open(page, "js-types-001");
  await page.getByRole("radio", { name: /"object"/ }).click();
  await page.getByRole("button", { name: /^(Cek|Check)$/ }).click();
  await expectCorrect(page);
});

test("predict-output (options)", async ({ page }) => {
  await open(page, "js-references-001");
  await page.getByRole("radio", { name: "4", exact: true }).click();
  await page.getByRole("button", { name: /^(Cek|Check)$/ }).click();
  await expectCorrect(page);
});

test("find-bug", async ({ page }) => {
  await open(page, "js-loops-001");
  await page.getByRole("radio", { name: /^Baris 3:/ }).click();
  await page.getByRole("button", { name: /^(Cek|Check)$/ }).click();
  await expectCorrect(page);
});

test("fill-blank (word bank)", async ({ page }) => {
  await open(page, "js-array-methods-001");
  await page.getByRole("button", { name: "map", exact: true }).click();
  await page.getByRole("button", { name: "2", exact: true }).click();
  await page.getByRole("button", { name: /^(Cek|Check)$/ }).click();
  await expectCorrect(page);
});

test("parsons", async ({ page }) => {
  await open(page, "js-strings-001");
  const correct = [
    "function countVowels(str) {",
    "  let count = 0;",
    "  for (const ch of str.toLowerCase()) {",
    "    if ('aiueo'.includes(ch)) count++;",
    "  }",
    "  return count;",
    "}",
  ];
  const items = page.locator("ol > li");
  const order = () => items.evaluateAll((lis) => lis.map((li) => li.querySelector("span")!.textContent));
  // Selection sort through the UI: move each target line up to its position.
  for (let target = 0; target < correct.length; target++) {
    for (;;) {
      const before = await order();
      const pos = before.indexOf(correct[target]);
      if (pos === target) break;
      await items.nth(pos).getByRole("button", { name: /Naikkan|Move up/ }).click();
      await expect.poll(order).not.toEqual(before);
    }
  }
  await page.getByRole("button", { name: /^(Cek|Check)$/ }).click();
  await expectCorrect(page);
});

test("flashcard", async ({ page }) => {
  await open(page, "concepts-closures-001");
  await page.getByRole("button", { name: /Tampilkan jawaban|Show answer/ }).click();
  await expect(page.getByText(/mengingat variabel/)).toBeVisible();
  await page.getByRole("button", { name: /^(Bisa|Good)$/ }).click();
  await expectCorrect(page);
});

test("code-short JS: failing then passing", async ({ page }) => {
  await open(page, "js-operators-001");
  const runBtn = page.getByRole("button", { name: /Jalankan tes|Run tests/ });
  await runBtn.click();
  await expect(page.getByText(/0\/4 (lulus|passed)/)).toBeVisible({ timeout: 15_000 });

  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("function isEven(n) {\nreturn n % 2 === 0;\n");
  await runBtn.click();
  await expectCorrect(page);
});

test("code-short TS (sucrase)", async ({ page }) => {
  await open(page, "ts-functions-001");
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("function greet(name: string): string {\nreturn `Halo, ${name}!`;\n");
  await page.getByRole("button", { name: /Jalankan tes|Run tests/ }).click();
  await expectCorrect(page);
});

test("code-short SQL (sql.js)", async ({ page }) => {
  await open(page, "sql-select-001");
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("SELECT name FROM employees WHERE dept = 'IT' ORDER BY name;");
  await page.getByRole("button", { name: /Jalankan tes|Run tests/ }).click();
  await expectCorrect(page);
});

test("code-full: symbol toolbar inserts text", async ({ page }) => {
  await open(page, "js-loops-002");
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+End");
  await page.getByRole("button", { name: "Sisipkan =>" }).click();
  await expect(page.locator(".cm-content")).toContainText("=>");
});

test("show solution counts as incorrect", async ({ page }) => {
  await open(page, "js-types-001");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Lihat solusi|Show solution/ }).click();
  await expect(page.getByText(/Solusi ditampilkan|Solution shown/)).toBeVisible();
});

test("desktop challenge downloads a zip", async ({ page }) => {
  await page.goto("/desktop/");
  await page.getByRole("button", { name: /Membalik string/ }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Unduh starter|Download starter/ }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("go-strings-desktop-001.zip");
});
