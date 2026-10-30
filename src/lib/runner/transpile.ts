import { transform } from "sucrase";

/**
 * TypeScript → JavaScript by stripping types (no type-checking at runtime).
 * Type-checking topics use non-executable formats instead.
 */
export function transpileTs(code: string): string {
  return transform(code, { transforms: ["typescript"], disableESTransforms: true }).code;
}
