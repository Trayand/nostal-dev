import type { Attempt } from "../storage/types";
import { addDays, dateOf } from "./dates";

// Read-only statistics derived from the attempt log.

/** Long idle time (tab left open) shouldn't inflate practice minutes. */
const MAX_ATTEMPT_MS = 10 * 60_000;

export interface TopicStat {
  track: string;
  topic: string;
  attempts: number;
  correct: number;
  accuracy: number;
  /** Misses in the last 14 days. */
  recentMisses: number;
  lastAt: string;
}

export const topicKey = (track: string, topic: string) => `${track}/${topic}`;

export function topicStats(attempts: Attempt[], today: string): Map<string, TopicStat> {
  const since = addDays(today, -14);
  const map = new Map<string, TopicStat>();
  for (const a of attempts) {
    const key = topicKey(a.track, a.topic);
    const s = map.get(key) ?? { track: a.track, topic: a.topic, attempts: 0, correct: 0, accuracy: 0, recentMisses: 0, lastAt: "" };
    s.attempts++;
    if (a.correct) s.correct++;
    else if (dateOf(a.answeredAt) >= since) s.recentMisses++;
    if (a.answeredAt > s.lastAt) s.lastAt = a.answeredAt;
    s.accuracy = s.correct / s.attempts;
    map.set(key, s);
  }
  return map;
}

/** Topics with enough data and low accuracy, weakest first. */
export function weakTopics(attempts: Attempt[], today: string, minAttempts = 3): TopicStat[] {
  return [...topicStats(attempts, today).values()]
    .filter((s) => s.attempts >= minAttempts && (s.accuracy < 0.7 || s.recentMisses >= 2))
    .sort((a, b) => a.accuracy - b.accuracy || b.recentMisses - a.recentMisses);
}

export function activityByDay(attempts: Attempt[]): Map<string, { count: number; minutes: number }> {
  const map = new Map<string, { count: number; minutes: number }>();
  for (const a of attempts) {
    const d = dateOf(a.answeredAt);
    const v = map.get(d) ?? { count: 0, minutes: 0 };
    v.count++;
    v.minutes += Math.min(a.durationMs, MAX_ATTEMPT_MS) / 60_000;
    map.set(d, v);
  }
  return map;
}

export function minutesOn(attempts: Attempt[], date: string): number {
  return activityByDay(attempts).get(date)?.minutes ?? 0;
}

/** Consecutive days with practice, ending today (or yesterday, if today isn't done yet). */
export function streak(attempts: Attempt[], today: string): number {
  const days = activityByDay(attempts);
  let day = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export function trackLevelStats(attempts: Attempt[]) {
  const out: Record<string, Record<number, { attempts: number; correct: number }>> = {};
  for (const a of attempts) {
    const t = (out[a.track] ??= {});
    const l = (t[a.level] ??= { attempts: 0, correct: 0 });
    l.attempts++;
    if (a.correct) l.correct++;
  }
  return out;
}
