"use client";

import { useCallback, useEffect, useState } from "react";
import { loadIndex, type ContentIndex } from "./content/loader";
import { getStorage, type ProgressSnapshot } from "./storage";

/** Content index + the learner's progress, loaded together for screens. */
export function useLearner() {
  const [index, setIndex] = useState<ContentIndex | null>(null);
  const [state, setState] = useState<ProgressSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [idx, progress] = await Promise.all([loadIndex(), getStorage().getProgress()]);
      setIndex(idx);
      setState(progress);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { index, state, error, reload, loading: !index || !state };
}
