import type { QuestionSummary } from "../content/loader";
import type { Profile } from "../profile";
import type { Attempt, SrsCard, TrackState } from "../storage/types";
import { addDays, dateOf } from "./dates";
import { currentLevel } from "./levels";
import { isDue } from "./srs";
import { topicKey, topicStats, type TopicStat } from "./stats";

// Builds the list of question ids for a session. Pure: the same inputs and
// rng give the same session, which keeps it unit-testable.

export type Rng = () => number;

/** Small seeded RNG (mulberry32). */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface LearnerState {
  attempts: Attempt[];
  srs: SrsCard[];
  trackStates: TrackState[];
}

interface WeightContext {
  stats: Map<string, TopicStat>;
  seen: Set<string>;
  recentCorrect: Set<string>;
  profile: Pick<Profile, "focusTopics" | "weakAreas">;
}

function weightContext(state: LearnerState, profile: WeightContext["profile"], today: string): WeightContext {
  const since = addDays(today, -2);
  return {
    stats: topicStats(state.attempts, today),
    seen: new Set(state.attempts.map((a) => a.questionId)),
    recentCorrect: new Set(state.attempts.filter((a) => a.correct && dateOf(a.answeredAt) >= since).map((a) => a.questionId)),
    profile,
  };
}

/**
 * How likely a question is to be picked. Weak topics (low accuracy, recent
 * misses, profile.weakAreas) are boosted; things just answered correctly are damped.
 */
export function questionWeight(q: QuestionSummary, ctx: WeightContext): number {
  let w = 1;
  const s = ctx.stats.get(topicKey(q.track, q.topic));
  if (!ctx.seen.has(q.id)) w *= 1.5;
  if (s && s.attempts >= 2) w *= 1 + 2 * (1 - s.accuracy);
  if (s) w *= 1 + 0.5 * Math.min(3, s.recentMisses);
  const labels = [q.topic, ...q.tags];
  if (ctx.profile.weakAreas.some((x) => labels.includes(x))) w *= 1.5;
  if (ctx.profile.focusTopics.some((x) => labels.includes(x))) w *= 1.3;
  if (ctx.recentCorrect.has(q.id)) w *= 0.2;
  return w;
}

/** Weighted sampling without replacement. */
export function weightedSample<T>(items: T[], weight: (t: T) => number, n: number, rng: Rng): T[] {
  const pool = items.map((item) => ({ item, w: Math.max(weight(item), 1e-6) }));
  const out: T[] = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let r = rng() * total;
    let i = 0;
    while (i < pool.length - 1 && r >= pool[i].w) r -= pool[i++].w;
    out.push(pool.splice(i, 1)[0].item);
  }
  return out;
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const sessionable = (q: QuestionSummary) => q.format !== "desktop";

export interface DailyOptions {
  questions: QuestionSummary[];
  state: LearnerState;
  profile: Pick<Profile, "focusTopics" | "weakAreas">;
  today: string;
  goalMinutes: number;
  rng?: Rng;
}

/**
 * Daily session (~goalMinutes): up to 40% due reviews, ~30% weak-spot
 * questions, the rest new questions at each track's current level.
 */
export function buildDailySession(o: DailyOptions): string[] {
  const rng = o.rng ?? Math.random;
  const pool = o.questions.filter(sessionable);
  const byId = new Map(pool.map((q) => [q.id, q]));
  const avgMinutes = pool.length ? pool.reduce((s, q) => s + q.estimatedMinutes, 0) / pool.length : 2;
  const target = Math.max(5, Math.min(15, Math.round(o.goalMinutes / Math.max(1, avgMinutes))));
  const ctx = weightContext(o.state, o.profile, o.today);
  const chosen: QuestionSummary[] = [];
  const taken = new Set<string>();
  const take = (qs: QuestionSummary[]) => qs.forEach((q) => { if (!taken.has(q.id)) { taken.add(q.id); chosen.push(q); } });

  // 1. Reviews: due SRS cards, most overdue first.
  const due = o.state.srs
    .filter((c) => isDue(c, o.today) && byId.has(c.questionId))
    .sort((a, b) => a.due.localeCompare(b.due))
    .map((c) => byId.get(c.questionId)!);
  take(due.slice(0, Math.round(target * 0.4)));

  // 2. Weak spots: seen-but-shaky topics, any level up to the current one.
  const weakTopicKeys = new Set(
    [...ctx.stats.values()].filter((s) => s.attempts >= 2 && s.accuracy < 0.7).map((s) => topicKey(s.track, s.topic)),
  );
  const weakPool = pool.filter(
    (q) => !taken.has(q.id) && weakTopicKeys.has(topicKey(q.track, q.topic)) && q.level <= currentLevel(o.state.trackStates, q.track),
  );
  take(weightedSample(weakPool, (q) => questionWeight(q, ctx), Math.round(target * 0.3), rng));

  // 3. New: unseen questions at each track's current level, then anything at/below it.
  const atLevel = (q: QuestionSummary) => q.level === currentLevel(o.state.trackStates, q.track);
  const upToLevel = (q: QuestionSummary) => q.level <= currentLevel(o.state.trackStates, q.track);
  for (const filter of [
    (q: QuestionSummary) => atLevel(q) && !ctx.seen.has(q.id),
    upToLevel,
    () => true,
  ]) {
    const rest = pool.filter((q) => !taken.has(q.id) && filter(q));
    take(weightedSample(rest, (q) => questionWeight(q, ctx), target - chosen.length, rng));
    if (chosen.length >= target) break;
  }

  return shuffle(chosen.slice(0, target), rng).map((q) => q.id);
}

export interface PracticeOptions {
  questions: QuestionSummary[];
  state: LearnerState;
  profile: Pick<Profile, "focusTopics" | "weakAreas">;
  today: string;
  track: string;
  level?: number;
  topic?: string;
  count?: number;
  rng?: Rng;
}

/** Practice on a chosen track/level/topic, weighted toward unseen and weak items. */
export function buildPracticeSession(o: PracticeOptions): string[] {
  const pool = o.questions.filter(
    (q) => sessionable(q) && q.track === o.track && (!o.level || q.level === o.level) && (!o.topic || q.topic === o.topic),
  );
  const ctx = weightContext(o.state, o.profile, o.today);
  return weightedSample(pool, (q) => questionWeight(q, ctx), o.count ?? 10, o.rng ?? Math.random).map((q) => q.id);
}

/** Flashcard review: all due cards, plus up to `newLimit` never-seen cards. */
export function buildCardsSession(o: {
  questions: QuestionSummary[];
  srs: SrsCard[];
  today: string;
  newLimit: number;
  onlyNew?: boolean;
}): string[] {
  const cards = o.questions.filter((q) => q.format === "flashcard");
  const srsById = new Map(o.srs.map((c) => [c.questionId, c]));
  const due = o.onlyNew
    ? []
    : cards
        .filter((q) => srsById.has(q.id) && isDue(srsById.get(q.id)!, o.today))
        .sort((a, b) => srsById.get(a.id)!.due.localeCompare(srsById.get(b.id)!.due));
  const fresh = cards.filter((q) => !srsById.has(q.id)).sort((a, b) => a.level - b.level).slice(0, o.newLimit);
  return [...due, ...fresh].map((q) => q.id);
}
