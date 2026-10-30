import raw from "~/profile.json";
import type { Lang } from "./storage/types";

// profile.json is bundled at build time. Edit it, then rebuild.
export interface Profile {
  lang: Lang;
  focusTopics: string[];
  weakAreas: string[];
  dailyGoalMinutes: number;
  levelThresholds: {
    /** How many recent attempts at the current level are considered. */
    windowSize: number;
    /** Accuracy (0..1) over that window needed to level up. */
    levelUpAccuracy: number;
  };
}

export const profile: Profile = {
  lang: raw.lang === "en" ? "en" : "id",
  focusTopics: raw.focusTopics ?? [],
  weakAreas: raw.weakAreas ?? [],
  dailyGoalMinutes: raw.dailyGoalMinutes ?? 15,
  levelThresholds: {
    windowSize: raw.levelThresholds?.windowSize ?? 10,
    levelUpAccuracy: raw.levelThresholds?.levelUpAccuracy ?? 0.8,
  },
};
