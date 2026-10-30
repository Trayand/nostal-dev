import type { Profile } from "../profile";
import type { StorageAdapter } from "../storage/types";
import { localDate } from "./dates";
import { currentLevel, shouldLevelUp } from "./levels";
import { gradeFromOutcome, reviewCard } from "./srs";

export interface OutcomeInput {
  correct: boolean;
  hintsUsed: number;
  revealed: boolean;
  durationMs: number;
  grade?: number;
}

interface QuestionRef {
  id: string;
  track: string;
  level: number;
  topic: string;
  format: string;
}

/**
 * Persists one answered question: attempt log → SRS schedule → level check.
 * Returns the new level when this answer triggered a level-up.
 */
export async function recordOutcome(
  storage: StorageAdapter,
  q: QuestionRef,
  outcome: OutcomeInput,
  opts: { thresholds: Profile["levelThresholds"]; sessionId?: string; now?: Date },
): Promise<{ levelUp: number | null }> {
  const now = opts.now ?? new Date();
  const iso = now.toISOString();
  const correct = outcome.correct && !outcome.revealed;

  await storage.saveAttempt({
    id: `${iso}-${Math.random().toString(36).slice(2, 8)}`,
    questionId: q.id,
    track: q.track,
    level: q.level,
    topic: q.topic,
    format: q.format,
    correct,
    hintsUsed: outcome.hintsUsed,
    revealed: outcome.revealed,
    durationMs: Math.round(outcome.durationMs),
    answeredAt: iso,
    sessionId: opts.sessionId,
  });

  if (q.format !== "desktop") {
    const prev = await storage.getSrsCard(q.id);
    const grade = gradeFromOutcome({ ...outcome, correct });
    await storage.saveSrsCard(reviewCard(prev, { questionId: q.id, track: q.track }, grade, localDate(now), iso));
  }

  const states = await storage.getTrackStates();
  const level = currentLevel(states, q.track);
  if (q.level === level && shouldLevelUp(await storage.getAttempts(), q.track, level, opts.thresholds)) {
    await storage.saveTrackState({ track: q.track, level: level + 1, updatedAt: iso });
    return { levelUp: level + 1 };
  }
  return { levelUp: null };
}
