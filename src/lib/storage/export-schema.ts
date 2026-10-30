import { z } from "zod";
import type { ExportFile } from "./types";

// Validates a backup file before importing it, so a broken or foreign JSON
// file can never corrupt local progress.
const attempt = z.object({
  id: z.string(),
  questionId: z.string(),
  track: z.string(),
  level: z.number(),
  topic: z.string(),
  format: z.string(),
  correct: z.boolean(),
  hintsUsed: z.number(),
  revealed: z.boolean(),
  durationMs: z.number(),
  answeredAt: z.string(),
  sessionId: z.string().optional(),
});

const srsCard = z.object({
  questionId: z.string(),
  track: z.string(),
  ease: z.number(),
  intervalDays: z.number(),
  reps: z.number(),
  lapses: z.number(),
  due: z.string(),
  lastReviewed: z.string(),
  updatedAt: z.string(),
});

const exportFile = z.object({
  app: z.literal("programming-hub"),
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  attempts: z.array(attempt),
  srs: z.array(srsCard),
  trackStates: z.array(z.object({ track: z.string(), level: z.number(), updatedAt: z.string() })),
  settings: z
    .object({
      theme: z.enum(["dark", "light", "system"]),
      lang: z.enum(["id", "en"]),
      dailyGoalMinutes: z.number(),
      updatedAt: z.string(),
    })
    .nullable(),
  drafts: z.array(z.object({ questionId: z.string(), code: z.string(), updatedAt: z.string() })).default([]),
});

export function parseExportFile(json: unknown): ExportFile {
  const result = exportFile.safeParse(json);
  if (!result.success) throw new Error(z.prettifyError(result.error));
  return result.data as ExportFile;
}
