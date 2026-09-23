export const PRIVACY_NOTICE_LAST_UPDATED = "September 23, 2026";
export const PRIVACY_NOTICE_TITLE = "Privacy";

export const PRIVACY_CONTACT_EMAIL = "privacy@nvrtrack.com";
export const SUPPORT_CONTACT_EMAIL = "support@nvrtrack.com";

export const PRIVACY_ONBOARDING_CONTEXT =
  "Your answers are saved to your NVRTRACK profile. Training preferences help us remember your setup, and your discovery answer helps us understand how people find NVRTRACK.";

const FORBIDDEN_CLAIM_PATTERNS = [
  /fully anonymous/i,
  /HIPAA/i,
  /HBNR/i,
  /CCPA/i,
  /never shared/i,
  /military-grade/i,
  /guaranteed deletion/i,
  /we guarantee/i,
  /certified/i,
  /compliant with/i,
  /OWNER_LEGAL_REVIEW_DRAFT/,
  /\[Owner review:/i,
  /gmail\.com/i,
];

export interface PrivacySection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: "information",
    title: "Information you provide",
    paragraphs: [
      "NVRTRACK is a personal fitness tracking web app. You create an account and can log training, nutrition, and progress information for your own use.",
      "When you sign up, you provide an email address and password so we can create and sign you into your account.",
      "Your profile can include a display name, optional height, preferred weight unit, timezone, and optional calorie and macro goals. Height is stored on your profile and you can edit it. NVRTRACK does not currently use height to calculate calorie needs.",
      "During setup, you can answer questions about your training goal, experience, desired training days, and training environment. Those training preferences are saved to your profile so NVRTRACK can remember your setup. You can view and edit them later in Profile.",
      "We also ask how you heard about NVRTRACK. That discovery answer is self-reported: it records how you say you found NVRTRACK. It may be used to understand how people discover NVRTRACK. It is not verified attribution, and it is not currently used for behavioral advertising or automated workout recommendations.",
      "After you sign in, you can log body weight, meals and foods, workouts, workout templates and schedules, progress photos, body measurements, journal notes, and in-app notification preferences.",
    ],
  },
  {
    id: "use",
    title: "How NVRTRACK uses information",
    paragraphs: [
      "NVRTRACK uses the information you provide to operate the app for you: sign you in, show your logs, calculate totals and training summaries, remember your setup, and keep your settings.",
      "Progress photos, measurements, food logs, workouts, and similar records are used to display your history in the app.",
    ],
  },
  {
    id: "services",
    title: "Services NVRTRACK uses",
    paragraphs: [
      "NVRTRACK uses Supabase for authentication, database, and file storage.",
      "The NVRTRACK web application is hosted on Vercel.",
      "Some built-in Common foods originated from reviewed USDA FoodData Central source data stored in NVRTRACK. Searching and logging foods does not send your search text or account information to USDA.",
      "These services receive information as needed to provide authentication, hosting, and storage. This notice does not describe how those providers use information beyond providing those services.",
    ],
  },
  {
    id: "advertising",
    title: "Advertising and analytics",
    paragraphs: [
      "NVRTRACK does not currently include third-party advertising, behavioral advertising, session replay, or product-analytics software in the app.",
    ],
  },
  {
    id: "controls",
    title: "Your controls",
    paragraphs: [
      "You can view and edit profile information and training preferences in Profile.",
      "You can create, edit, and delete individual weight entries, food logs, saved foods, workouts, progress photos, body measurements, and journal entries in the corresponding screens.",
      "You can log out from Profile.",
      "NVRTRACK does not currently provide self-service account deletion, a complete data export, or a privacy-request dashboard in the app. For privacy questions or requests, email privacy@nvrtrack.com.",
    ],
  },
  {
    id: "security",
    title: "Security",
    paragraphs: [
      "App screens other than public pages such as Log in, Create account, and this Privacy page require you to be signed in.",
      "Your account records are stored so that other NVRTRACK users cannot open them from their own signed-in session.",
      "These practices help protect your information. They do not guarantee that information cannot be lost, accessed, or disclosed.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      "For privacy questions or requests, email privacy@nvrtrack.com.",
      "For general product support, email support@nvrtrack.com.",
    ],
  },
  {
    id: "changes",
    title: "Changes to this notice",
    paragraphs: [
      "If NVRTRACK’s practices change, this notice will be updated. This notice does not set a guaranteed update schedule.",
    ],
  },
];

export function getPrivacyNoticePlainText(): string {
  const parts = [
    PRIVACY_NOTICE_TITLE,
    PRIVACY_NOTICE_LAST_UPDATED,
    PRIVACY_ONBOARDING_CONTEXT,
    PRIVACY_CONTACT_EMAIL,
    SUPPORT_CONTACT_EMAIL,
    ...PRIVACY_SECTIONS.flatMap((section) => [
      section.title,
      ...section.paragraphs,
      ...(section.bullets ?? []),
    ]),
  ];
  return parts.join("\n");
}

export function findForbiddenPrivacyClaims(text: string = getPrivacyNoticePlainText()): string[] {
  return FORBIDDEN_CLAIM_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

export function linkifyContactEmails(text: string): Array<{ type: "text" | "mailto"; value: string }> {
  const emails = [PRIVACY_CONTACT_EMAIL, SUPPORT_CONTACT_EMAIL];
  const pattern = new RegExp(`(${emails.map((email) => email.replace(".", "\\.")).join("|")})`, "g");
  const parts: Array<{ type: "text" | "mailto"; value: string }> = [];
  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, index) });
    }
    parts.push({ type: "mailto", value: match[0] ?? "" });
    lastIndex = index + (match[0]?.length ?? 0);
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  return parts.length > 0 ? parts : [{ type: "text", value: text }];
}
