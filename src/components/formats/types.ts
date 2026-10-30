import type { AnswerValue } from "@/lib/content/check";
import type { BundledQuestion } from "@/lib/content/loader";

export type QuestionOf<F extends BundledQuestion["format"]> = Extract<BundledQuestion, { format: F }>;

/** Props shared by the non-code format components. */
export interface FormatProps<F extends BundledQuestion["format"]> {
  q: QuestionOf<F>;
  value: AnswerValue | null;
  onChange: (value: AnswerValue) => void;
  /** Answer is locked (checked or solution shown). */
  locked: boolean;
}
