import { describe, expect, it } from "vitest";

import { sanitizeNextPath } from "./safe-next-path";

describe("sanitizeNextPath", () => {
  it("accepts internal paths with query/hash", () => {
    expect(sanitizeNextPath("/training")).toBe("/training");
    expect(sanitizeNextPath("/progress?tab=photos#compare")).toBe("/progress?tab=photos#compare");
  });

  it("rejects absolute and protocol-relative urls", () => {
    expect(sanitizeNextPath("https://evil.example")).toBe("/");
    expect(sanitizeNextPath("//evil.example/path")).toBe("/");
  });

  it("rejects malformed paths and backslash variants", () => {
    expect(sanitizeNextPath("/\\evil")).toBe("/");
    expect(sanitizeNextPath("/%5Cevil")).toBe("/");
    expect(sanitizeNextPath("/%E0%A4%A")).toBe("/");
  });
});
