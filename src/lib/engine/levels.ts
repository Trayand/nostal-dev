import type { Profile } from "../profile";
import type { Attempt, TrackState } from "../storage/types";

// Level-up rule: accuracy ≥ levelUpAccuracy over the last `windowSize`
// attempts at the track's current level (both configurable in profile.json).

export const MAX_LEVEL = 5;
type Thresholds = Profile["levelThresholds"];

export function currentLevel(states: TrackState[], track: string): number {
  return states.find((s) => s.track === track)?.level ?? 1;
}

export function levelProgress(attempts: Attempt[], track: string, level: number, t: Thresholds) {
  const recent = attempts
    .filter((a) => a.track === track && a.level === level)
    .sort((a, b) => a.answeredAt.localeCompare(b.answeredAt))
    .slice(-t.windowSize);
  const correct = recent.filter((a) => a.correct).length;
  return {
    count: recent.length,
    correct,
    accuracy: recent.length ? correct / recent.length : 0,
    windowSize: t.windowSize,
  };
}

export function shouldLevelUp(attempts: Attempt[], track: string, level: number, t: Thresholds): boolean {
  if (level >= MAX_LEVEL) return false;
  const p = levelProgress(attempts, track, level, t);
  return p.count >= t.windowSize && p.accuracy >= t.levelUpAccuracy;
}
