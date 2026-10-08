import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultGenerator,
  handleGenerateRequest,
  resetGuardsForTests,
} from "@/app/api/generate/route";
import type { CampaignInput, ContentPack } from "@/lib/content";

const input: CampaignInput = {
  businessName: "Plain Service",
  businessFacts: "Residential window cleaning in Boise, Idaho.",
  targetAudience: "Boise homeowners",
  topic: "Spring window cleaning",
  tone: "Friendly",
  nextAction: "Request an appointment",
  avoid: "No discounts",
};

const pack: ContentPack = {
  socialPosts: ["First angle", "Second angle", "Third angle"],
  email: { subject: "Clear windows", body: "Email body" },
  videoScript: "A short script.",
  detailsToConfirm: [],
};

function request(body: unknown, headers?: HeadersInit) {
  return new Request("http://localhost/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => resetGuardsForTests());

describe("generation route", () => {
  it("rejects required and oversized input before provider invocation", async () => {
    const generator = vi.fn(async () => pack);
    const missing = await handleGenerateRequest(
      request({ ...input, businessName: "" }),
      generator,
    );
    expect(missing.status).toBe(400);

    const oversized = await handleGenerateRequest(
      request(input, { "content-length": "20000" }),
      generator,
    );
    expect(oversized.status).toBe(413);
    expect(generator).not.toHaveBeenCalled();
  });

  it("reports missing provider configuration", async () => {
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    await expect(defaultGenerator(input)).rejects.toThrow(
      "PROVIDER_NOT_CONFIGURED",
    );
    if (previous) process.env.OPENAI_API_KEY = previous;

    const response = await handleGenerateRequest(request(input));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("not configured"),
    });
  });

  it("rejects invalid structured output and maps provider failures", async () => {
    const invalid = await handleGenerateRequest(
      request(input),
      async () => ({ ...pack, socialPosts: ["Only one"] }) as ContentPack,
    );
    expect(invalid.status).toBe(502);

    resetGuardsForTests();
    const failed = await handleGenerateRequest(request(input), async () => {
      throw new Error("provider details must not leak");
    });
    expect(failed.status).toBe(502);
    expect(JSON.stringify(await failed.json())).not.toContain("must not leak");
  });

  it("blocks concurrent duplicate requests", async () => {
    let release!: (value: ContentPack) => void;
    const pending = new Promise<ContentPack>((resolve) => {
      release = resolve;
    });
    const first = handleGenerateRequest(request(input), () => pending);
    await Promise.resolve();
    const duplicate = await handleGenerateRequest(request(input), async () => pack);
    expect(duplicate.status).toBe(409);
    release(pack);
    expect((await first).status).toBe(200);
  });
});
