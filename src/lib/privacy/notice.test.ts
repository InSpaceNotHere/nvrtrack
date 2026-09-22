import { describe, expect, it } from "vitest";

import {
  findForbiddenPrivacyClaims,
  getPrivacyNoticePlainText,
  linkifyContactEmails,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_ONBOARDING_CONTEXT,
  SUPPORT_CONTACT_EMAIL,
} from "./notice";

describe("public privacy notice", () => {
  it("does not make unsupported legal or security claims", () => {
    expect(findForbiddenPrivacyClaims()).toEqual([]);
  });

  it("uses verified contact addresses and does not expose a forwarding inbox", () => {
    const text = getPrivacyNoticePlainText();
    expect(text).toContain(PRIVACY_CONTACT_EMAIL);
    expect(text).toContain(SUPPORT_CONTACT_EMAIL);
    expect(text.toLowerCase()).not.toContain("gmail.com");
    expect(text).not.toContain("OWNER_LEGAL_REVIEW_DRAFT");
    expect(text).not.toMatch(/\[Owner review:/i);
  });

  it("states that account deletion and export are not in-app features", () => {
    const text = getPrivacyNoticePlainText();
    expect(text).toMatch(/does not currently provide self-service account deletion/i);
    expect(text).toMatch(/complete data export/i);
  });

  it("explains discovery source without calling it verified attribution", () => {
    const text = getPrivacyNoticePlainText();
    expect(text).toMatch(/self-reported/);
    expect(text).toMatch(/not verified attribution/);
    expect(text).toMatch(/not currently used for behavioral advertising or automated workout recommendations/);
  });

  it("states height is stored, editable, and unused for calorie needs", () => {
    const text = getPrivacyNoticePlainText();
    expect(text).toMatch(/Height is stored on your profile and you can edit it/);
    expect(text).toMatch(/does not currently use height to calculate calorie needs/);
  });

  it("identifies current processors without unverified processing promises", () => {
    const text = getPrivacyNoticePlainText();
    expect(text).toMatch(/Supabase for authentication, database, and file storage/);
    expect(text).toMatch(/hosted on Vercel/);
    expect(text).toMatch(/USDA FoodData Central/);
  });

  it("uses concise onboarding wording for profile save, setup, and discovery", () => {
    expect(PRIVACY_ONBOARDING_CONTEXT).toBe(
      "Your answers are saved to your NVRTRACK profile. Training preferences help us remember your setup, and your discovery answer helps us understand how people find NVRTRACK.",
    );
    expect(PRIVACY_ONBOARDING_CONTEXT.toLowerCase()).not.toContain("product improvement");
    expect(PRIVACY_ONBOARDING_CONTEXT.toLowerCase()).not.toContain("app experience");
  });

  it("turns contact addresses into mailto parts", () => {
    const parts = linkifyContactEmails(`Email ${PRIVACY_CONTACT_EMAIL} or ${SUPPORT_CONTACT_EMAIL}.`);
    expect(parts).toEqual([
      { type: "text", value: "Email " },
      { type: "mailto", value: PRIVACY_CONTACT_EMAIL },
      { type: "text", value: " or " },
      { type: "mailto", value: SUPPORT_CONTACT_EMAIL },
      { type: "text", value: "." },
    ]);
  });
});
