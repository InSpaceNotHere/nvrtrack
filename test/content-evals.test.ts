import { describe, expect, it } from "vitest";
import { CONTENT_EVAL_CASES } from "@/evals/content-boundaries";

describe("content boundary evaluation fixtures", () => {
  for (const evaluation of CONTENT_EVAL_CASES) {
    it(evaluation.name, () => {
      expect(evaluation.assert(evaluation.candidate)).toBe(true);
    });
  }
});
