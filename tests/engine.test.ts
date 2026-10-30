import { describe, expect, it } from "vitest";
import type { QuestionSummary } from "@/lib/content/loader";
import { addDays } from "@/lib/engine/dates";
import { levelProgress, shouldLevelUp } from "@/lib/engine/levels";
import { recordOutcome } from "@/lib/engine/record";
import { buildCardsSession, buildDailySession, buildPracticeSession, seededRng, weightedSample } from "@/lib/engine/session";
import { gradeFromOutcome, isDue, reviewCard } from "@/lib/engine/srs";
import { streak, weakTopics } from "@/lib/engine/stats";
import { MemoryAdapter } from "@/lib/storage/memory";
import type { Attempt } from "@/lib/storage/types";

const thresholds = { windowSize: 10, levelUpAccuracy: 0.8 };
const TODAY = "2026-10-25";
let seq = 0;

function attempt(p: Partial<Attempt> = {}): Attempt {
  seq++;
  return {
    id: `a${seq}`, questionId: `q${seq}`, track: "javascript", level: 1, topic: "loops", format: "multiple-choice",
    correct: true, hintsUsed: 0, revealed: false, durationMs: 60_000,
    answeredAt: new Date(Date.UTC(2026, 9, 25, 3, 0, seq)).toISOString(), ...p,
  };
}

const series = (results: boolean[], p: Partial<Attempt> = {}) => results.map((correct) => attempt({ correct, ...p }));

describe("level-up", () => {
  it("needs a full window of attempts", () => {
    expect(shouldLevelUp(series(Array(9).fill(true)), "javascript", 1, thresholds)).toBe(false);
    expect(shouldLevelUp(series(Array(10).fill(true)), "javascript", 1, thresholds)).toBe(true);
  });

  it("requires ≥80% over the LAST 10 at the current level", () => {
    const old = series(Array(10).fill(false));
    const recent = series([true, true, true, true, true, true, true, true, false, false]); // 8/10
    expect(shouldLevelUp([...old, ...recent], "javascript", 1, thresholds)).toBe(true);
    const weak = series([true, true, true, true, true, true, true, false, false, false]); // 7/10
    expect(shouldLevelUp([...old, ...weak], "javascript", 1, thresholds)).toBe(false);
  });

  it("ignores other tracks and levels", () => {
    const attempts = [...series(Array(10).fill(true), { level: 2 }), ...series(Array(10).fill(true), { track: "sql" })];
    expect(shouldLevelUp(attempts, "javascript", 1, thresholds)).toBe(false);
    expect(levelProgress(attempts, "javascript", 2, thresholds).count).toBe(10);
  });

  it("never goes above level 5", () => {
    expect(shouldLevelUp(series(Array(10).fill(true), { level: 5 }), "javascript", 5, thresholds)).toBe(false);
  });

  it("respects custom thresholds", () => {
    expect(shouldLevelUp(series([true, true, true, false, true]), "javascript", 1, { windowSize: 5, levelUpAccuracy: 0.8 })).toBe(true);
  });
});

describe("SRS (SM-2 simplified)", () => {
  const meta = { questionId: "q", track: "concepts" };

  it("schedules 1 → 3 → ~8 days on good answers", () => {
    const c1 = reviewCard(undefined, meta, 4, TODAY);
    expect([c1.intervalDays, c1.due]).toEqual([1, addDays(TODAY, 1)]);
    const c2 = reviewCard(c1, meta, 4, c1.due);
    expect(c2.intervalDays).toBe(3);
    const c3 = reviewCard(c2, meta, 4, c2.due);
    expect(c3.intervalDays).toBe(Math.round(3 * c2.ease));
  });

  it("resets on a lapse and lowers ease, never below 1.3", () => {
    let c = reviewCard(undefined, meta, 4, TODAY);
    c = reviewCard(c, meta, 4, TODAY);
    const lapsed = reviewCard(c, meta, 1, TODAY);
    expect(lapsed.reps).toBe(0);
    expect(lapsed.intervalDays).toBe(1);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.ease).toBeLessThan(c.ease);
    for (let i = 0; i < 20; i++) c = reviewCard(c, meta, 0, TODAY);
    expect(c.ease).toBe(1.3);
  });

  it("easy answers grow faster than good ones", () => {
    const good = reviewCard(reviewCard(undefined, meta, 4, TODAY), meta, 4, TODAY);
    const easy = reviewCard(reviewCard(undefined, meta, 5, TODAY), meta, 5, TODAY);
    expect(easy.intervalDays).toBeGreaterThan(good.intervalDays);
  });

  it("maps outcomes to grades (solution shown = 0, hints = hard)", () => {
    expect(gradeFromOutcome({ correct: false, hintsUsed: 0, revealed: true })).toBe(0);
    expect(gradeFromOutcome({ correct: false, hintsUsed: 0, revealed: false })).toBe(1);
    expect(gradeFromOutcome({ correct: true, hintsUsed: 1, revealed: false })).toBe(3);
    expect(gradeFromOutcome({ correct: true, hintsUsed: 0, revealed: false })).toBe(4);
    expect(gradeFromOutcome({ correct: true, hintsUsed: 0, revealed: false, grade: 5 })).toBe(5);
  });

  it("isDue compares local dates", () => {
    const c = reviewCard(undefined, meta, 4, TODAY);
    expect(isDue(c, TODAY)).toBe(false);
    expect(isDue(c, addDays(TODAY, 1))).toBe(true);
  });
});

describe("stats", () => {
  const onDay = (d: string) => attempt({ answeredAt: `${d}T05:00:00.000Z` });

  it("counts a streak ending today or yesterday", () => {
    const days = [TODAY, addDays(TODAY, -1), addDays(TODAY, -2), addDays(TODAY, -4)];
    expect(streak(days.map(onDay), TODAY)).toBe(3);
    expect(streak(days.slice(1).map(onDay), TODAY)).toBe(2);
    expect(streak([onDay(addDays(TODAY, -3))], TODAY)).toBe(0);
  });

  it("finds weak topics", () => {
    const attempts = [
      ...series([false, false, true], { topic: "promises" }),
      ...series([true, true, true], { topic: "loops" }),
    ];
    expect(weakTopics(attempts, TODAY).map((t) => t.topic)).toEqual(["promises"]);
  });
});

describe("session builder", () => {
  const q = (id: string, p: Partial<QuestionSummary> = {}): QuestionSummary => ({
    id, track: "javascript", level: 1, format: "multiple-choice", topic: "loops", tags: [], title: id, estimatedMinutes: 2, ...p,
  });
  const profile = { focusTopics: [], weakAreas: [] };
  const bank = [
    ...Array.from({ length: 20 }, (_, i) => q(`l1-${i}`, { topic: i < 5 ? "promises" : "loops" })),
    ...Array.from({ length: 10 }, (_, i) => q(`l2-${i}`, { level: 2 })),
    q("big", { format: "desktop" }),
  ];
  const empty = { attempts: [], srs: [], trackStates: [] };

  it("fits the daily goal, stays at the current level and skips desktop items", () => {
    const ids = buildDailySession({ questions: bank, state: empty, profile, today: TODAY, goalMinutes: 15, rng: seededRng(1) });
    expect(ids.length).toBeGreaterThanOrEqual(5);
    expect(ids.length).toBeLessThanOrEqual(15);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith("l1-"))).toBe(true);
  });

  it("includes due reviews and weak-spot items", () => {
    const srs = [reviewCard(undefined, { questionId: "l2-3", track: "javascript" }, 1, addDays(TODAY, -5))];
    const attempts = series([false, false, false], { topic: "promises", questionId: "l1-0" });
    const ids = buildDailySession({
      questions: bank, state: { attempts, srs, trackStates: [] }, profile, today: TODAY, goalMinutes: 15, rng: seededRng(2),
    });
    expect(ids).toContain("l2-3");
    const promises = ids.filter((id) => Number(id.split("-")[1]) < 5 && id.startsWith("l1-"));
    expect(promises.length).toBeGreaterThan(0);
  });

  it("is deterministic for a given seed", () => {
    const run = () => buildDailySession({ questions: bank, state: empty, profile, today: TODAY, goalMinutes: 15, rng: seededRng(42) });
    expect(run()).toEqual(run());
  });

  it("practice filters by track, level and topic", () => {
    const ids = buildPracticeSession({ questions: bank, state: empty, profile, today: TODAY, track: "javascript", level: 1, topic: "promises", rng: seededRng(3) });
    expect(ids.sort()).toEqual(["l1-0", "l1-1", "l1-2", "l1-3", "l1-4"]);
  });

  it("weighted sampling favours heavy items", () => {
    let heavy = 0;
    const rng = seededRng(7);
    for (let i = 0; i < 500; i++) if (weightedSample(["a", "b"], (x) => (x === "a" ? 9 : 1), 1, rng)[0] === "a") heavy++;
    expect(heavy).toBeGreaterThan(400);
  });

  it("cards session: due cards first, then limited new cards", () => {
    const cards = ["c1", "c2", "c3", "c4"].map((id) => q(id, { format: "flashcard", track: "concepts" }));
    const srs = [
      reviewCard(undefined, { questionId: "c2", track: "concepts" }, 4, addDays(TODAY, -3)),
      reviewCard(undefined, { questionId: "c3", track: "concepts" }, 5, TODAY), // not due yet
    ];
    expect(buildCardsSession({ questions: cards, srs, today: TODAY, newLimit: 1 })).toEqual(["c2", "c1"]);
  });
});

describe("recordOutcome", () => {
  const ref = { id: "q1", track: "javascript", level: 1, topic: "loops", format: "multiple-choice" };

  it("stores the attempt, schedules SRS, and levels up after 10 good answers", async () => {
    const storage = new MemoryAdapter();
    let last = { levelUp: null as number | null };
    for (let i = 0; i < 10; i++) {
      last = await recordOutcome(storage, { ...ref, id: `q${i}` }, { correct: true, hintsUsed: 0, revealed: false, durationMs: 1000 },
        { thresholds, now: new Date(Date.UTC(2026, 9, 25, 8, 0, i)) });
    }
    expect(last.levelUp).toBe(2);
    expect((await storage.getTrackStates())[0].level).toBe(2);
    expect(await storage.getAttempts()).toHaveLength(10);
    expect((await storage.getSrsCard("q0"))?.reps).toBe(1);
  });

  it("records 'show solution' as incorrect", async () => {
    const storage = new MemoryAdapter();
    await recordOutcome(storage, ref, { correct: true, hintsUsed: 0, revealed: true, durationMs: 1000 }, { thresholds });
    const [a] = await storage.getAttempts();
    expect(a.correct).toBe(false);
    expect((await storage.getSrsCard("q1"))?.intervalDays).toBe(1);
  });

  it("does not schedule desktop challenges in SRS", async () => {
    const storage = new MemoryAdapter();
    await recordOutcome(storage, { ...ref, format: "desktop" }, { correct: true, hintsUsed: 0, revealed: false, durationMs: 1 }, { thresholds });
    expect(await storage.getSrsCards()).toEqual([]);
  });
});
