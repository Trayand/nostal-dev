import type { SrsCard } from "../storage/types";
import { addDays } from "./dates";

// Spaced repetition, SM-2 simplified.
// Grades use the SM-2 scale 0..5: below 3 = forgotten, 3 = hard, 4 = good, 5 = easy.

export const START_EASE = 2.5;
export const MIN_EASE = 1.3;

/** Turns a question outcome into an SM-2 grade. */
export function gradeFromOutcome(o: { correct: boolean; hintsUsed: number; revealed: boolean; grade?: number }): number {
  if (o.grade !== undefined) return o.grade; // flashcards: the learner graded themselves
  if (o.revealed) return 0;
  if (!o.correct) return 1;
  return o.hintsUsed > 0 ? 3 : 4;
}

export function reviewCard(
  prev: SrsCard | undefined,
  meta: { questionId: string; track: string },
  grade: number,
  today: string,
  now: string = new Date().toISOString(),
): SrsCard {
  const card = prev ?? {
    ...meta, ease: START_EASE, intervalDays: 0, reps: 0, lapses: 0, due: today, lastReviewed: today, updatedAt: now,
  };
  let { ease, intervalDays, reps, lapses } = card;

  if (grade < 3) {
    reps = 0;
    lapses += prev ? 1 : 0;
    intervalDays = 1;
  } else {
    reps += 1;
    if (reps === 1) intervalDays = 1;
    else if (reps === 2) intervalDays = 3;
    else intervalDays = Math.max(intervalDays + 1, Math.round(intervalDays * ease));
    if (grade === 5) intervalDays = Math.round(intervalDays * 1.3) || 1;
  }
  const q = 5 - grade;
  ease = Math.max(MIN_EASE, ease + 0.1 - q * (0.08 + q * 0.02));

  return {
    ...card,
    ease: Math.round(ease * 100) / 100,
    intervalDays,
    reps,
    lapses,
    due: addDays(today, intervalDays),
    lastReviewed: today,
    updatedAt: now,
  };
}

export function isDue(card: SrsCard, today: string): boolean {
  return card.due <= today;
}
