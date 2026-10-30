import { describe, expect, it } from "vitest";
import { validateBank, isShippable } from "@/lib/content/validate";
import { nodeExecutor } from "../scripts/lib/node-runner";
import { brokenItems, goodItem } from "./fixtures/broken";

const trackIds = ["javascript", "sql", "go", "concepts"];

function fileFor(item: Record<string, unknown>) {
  return `content/${item.track}/l${item.level}/fixtures.json`;
}

describe("content validator", () => {
  it("accepts a valid executable item", async () => {
    const [r] = await validateBank([{ path: fileFor(goodItem), json: [goodItem] }], { trackIds, exec: nodeExecutor });
    expect(r.errors).toEqual([]);
    expect(r.executed).toBe(true);
    expect(isShippable(r)).toBe(true);
  });

  for (const { item, expect: fragment } of brokenItems) {
    it(`rejects ${item.id}`, async () => {
      const [r] = await validateBank([{ path: fileFor(item), json: [item] }], { trackIds, exec: nodeExecutor });
      expect(r.ok).toBe(false);
      expect(isShippable(r)).toBe(false);
      expect(r.errors.join("\n")).toContain(fragment);
    });
  }

  it("detects duplicate ids across files", async () => {
    const results = await validateBank(
      [
        { path: fileFor(goodItem), json: [goodItem] },
        { path: "content/javascript/l1/other.json", json: [{ ...goodItem, title: "Something else entirely" }] },
      ],
      { trackIds, skipExecution: true },
    );
    expect(results.every((r) => r.errors.some((e) => e.includes("duplicate id")))).toBe(true);
  });

  it("warns about near-duplicate titles", async () => {
    const results = await validateBank(
      [{ path: fileFor(goodItem), json: [goodItem, { ...goodItem, id: "fixture-good-add-2", title: "Add two numbers together" }] }],
      { trackIds, skipExecution: true },
    );
    expect(results[0].warnings.join()).toContain("near-duplicate");
  });

  it("rejects items in the wrong folder", async () => {
    const [r] = await validateBank([{ path: "content/javascript/l3/x.json", json: [goodItem] }], { trackIds, skipExecution: true });
    expect(r.errors.join()).toContain("does not match folder");
  });

  it("never ships drafts, even when they pass", async () => {
    const draft = { ...goodItem, status: "draft" };
    const [r] = await validateBank([{ path: fileFor(draft), json: [draft] }], { trackIds, exec: nodeExecutor });
    expect(r.ok).toBe(true);
    expect(isShippable(r)).toBe(false);
  });
});
