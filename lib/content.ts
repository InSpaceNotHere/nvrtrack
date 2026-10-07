import { z } from "zod";

const trimmed = (label: string, max: number, required = false) => {
  let schema = z.string().trim().max(max, `${label} must be ${max} characters or fewer.`);
  if (required) schema = schema.min(1, `${label} is required.`);
  return schema;
};

export const campaignInputSchema = z
  .object({
    businessName: trimmed("Business name", 120, true),
    businessFacts: trimmed("Business facts", 4000, true),
    targetAudience: trimmed("Target audience", 1000, true),
    topic: trimmed("Topic or offer", 1200, true),
    tone: z.enum(["Friendly", "Professional", "Direct"]),
    nextAction: trimmed("Desired next action", 500),
    avoid: trimmed("Things to avoid", 1000),
  })
  .superRefine((value, context) => {
    const total = Object.values(value).join("").length;
    if (total > 8000) {
      context.addIssue({
        code: "custom",
        message: "Combined input must be 8,000 characters or fewer.",
      });
    }
  });

export const contentPackSchema = z.object({
  socialPosts: z
    .array(z.string().trim().min(1).max(1200))
    .length(3, "Exactly three social posts are required."),
  email: z.object({
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(3000),
  }),
  videoScript: z.string().trim().min(1).max(1500),
  detailsToConfirm: z.array(z.string().trim().min(1).max(300)).max(8),
});

export type CampaignInput = z.infer<typeof campaignInputSchema>;
export type ContentPack = z.infer<typeof contentPackSchema>;

export const EMPTY_INPUT: CampaignInput = {
  businessName: "",
  businessFacts: "",
  targetAudience: "",
  topic: "",
  tone: "Friendly",
  nextAction: "",
  avoid: "",
};

export function formatPack(pack: ContentPack): string {
  const details =
    pack.detailsToConfirm.length > 0
      ? pack.detailsToConfirm.map((item) => `- ${item}`).join("\n")
      : "None.";

  return [
    "NVR Content Pack",
    "",
    "SOCIAL POSTS",
    "",
    ...pack.socialPosts.flatMap((post, index) => [
      `Social Post ${index + 1}`,
      post,
      "",
    ]),
    "EMAIL",
    "",
    `Subject: ${pack.email.subject}`,
    "",
    pack.email.body,
    "",
    "VIDEO SCRIPT",
    "",
    pack.videoScript,
    "",
    "IMPORTANT DETAILS TO CONFIRM",
    "",
    details,
    "",
    "Review before sharing.",
  ].join("\n");
}
