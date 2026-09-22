import { describe, expect, it } from "vitest";

import { findForbiddenPrivacyClaims, getPrivacyNoticePlainText, PRIVACY_ONBOARDING_CONTEXT } from "./notice";

describe("privacy notice draft", () => {
  it("does not make unsupported legal or security claims", () => {
    expect(findForbiddenPrivacyClaims()).toEqual([]);
  });

  it("states that account deletion and export are not in-app features", () => {
    const text = getPrivacyNoticePlainText();
    expect(text).toMatch(/does not currently provide an in-app account deletion flow/i);
    expect(text).toMatch(/full data-export download/i);
  });

  it("keeps the onboarding line limited to profile save and app experience", () => {
    expect(PRIVACY_ONBOARDING_CONTEXT).toBe(
      "Your answers are saved to your NVRTRACK profile and used to support your app experience.",
    );
    expect(PRIVACY_ONBOARDING_CONTEXT.toLowerCase()).not.toContain("product improvement");
  });
});
