import { describe, expect, it } from "vitest";

import { isBusinessRoute, POST_AUTH_HOME } from "./routes";

describe("command center routes", () => {
  it("treats the app root and Today as the business home", () => {
    expect(POST_AUTH_HOME).toBe("/today");
    expect(isBusinessRoute("/")).toBe(true);
    expect(isBusinessRoute("/today")).toBe(true);
  });

  it("recognizes business product routes", () => {
    expect(isBusinessRoute("/tasks")).toBe(true);
    expect(isBusinessRoute("/opportunities")).toBe(true);
    expect(isBusinessRoute("/account")).toBe(true);
  });

  it("does not treat fitness tabs as the active product", () => {
    expect(isBusinessRoute("/nutrition")).toBe(false);
    expect(isBusinessRoute("/training")).toBe(false);
    expect(isBusinessRoute("/progress")).toBe(false);
    expect(isBusinessRoute("/profile")).toBe(false);
  });
});
