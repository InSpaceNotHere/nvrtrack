import type { CampaignInput, ContentPack } from "@/lib/content";

export type ContentEvalCase = {
  name: string;
  input: CampaignInput;
  candidate: ContentPack;
  assert: (pack: ContentPack) => boolean;
  purpose: string;
};

const base: CampaignInput = {
  businessName: "Cedar Desk",
  businessFacts: "Remote bookkeeping support for independent consultants.",
  targetAudience: "Independent consultants",
  topic: "Monthly bookkeeping support",
  tone: "Professional",
  nextAction: "Ask about support",
  avoid: "",
};

const pack = (social: string, detailsToConfirm: string[] = []): ContentPack => ({
  socialPosts: [social, `${social} A second angle.`, `${social} A third angle.`],
  email: { subject: "Bookkeeping support", body: social },
  videoScript: social,
  detailsToConfirm,
});

const allText = (value: ContentPack) => JSON.stringify(value).toLowerCase();

export const CONTENT_EVAL_CASES: ContentEvalCase[] = [
  {
    name: "no supplied price means no invented price",
    input: base,
    candidate: pack("Cedar Desk provides remote monthly bookkeeping support."),
    assert: (candidate) =>
      !/[$€£]\s?\d|\b\d+(?:\.\d{1,2})?\s?(?:dollars|usd|per month)\b/i.test(
        allText(candidate),
      ),
    purpose: "Catch unsupported price claims.",
  },
  {
    name: "explicit no discounts means no discount claims",
    input: { ...base, avoid: "No discounts or special offers" },
    candidate: pack("Get clear, remote bookkeeping support from Cedar Desk."),
    assert: (candidate) =>
      !/\bdiscount|percent off|%\s*off|special offer|save \$/.test(
        allText(candidate),
      ),
    purpose: "Catch prohibited promotional claims.",
  },
  {
    name: "audience change materially changes content",
    input: { ...base, targetAudience: "First-time independent consultants" },
    candidate: pack(
      "New to independent consulting? Build a clear bookkeeping routine with remote support.",
    ),
    assert: (candidate) =>
      /new to independent consulting|first-time/.test(allText(candidate)),
    purpose: "Check that audience context is visible in the writing.",
  },
  {
    name: "missing requested terms are flagged, not invented",
    input: {
      ...base,
      topic: "Promote a limited-time bookkeeping package",
    },
    candidate: pack("Ask Cedar Desk about monthly bookkeeping support.", [
      "Confirm the package terms and valid dates before promoting it.",
    ]),
    assert: (candidate) =>
      candidate.detailsToConfirm.length > 0 &&
      !/\bends (?:today|tomorrow)|only \d+ spots|limited spots\b/.test(
        allText(candidate),
      ),
    purpose: "Require missing offer terms to be surfaced without fabrication.",
  },
];
