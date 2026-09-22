export const PRIVACY_NOTICE_STATUS = "OWNER_LEGAL_REVIEW_DRAFT";
export const PRIVACY_NOTICE_EFFECTIVE_DATE = "September 22, 2026";
export const PRIVACY_NOTICE_TITLE = "Privacy";

export const PRIVACY_ONBOARDING_CONTEXT =
  "Your answers are saved to your NVRTRACK profile and used to support your app experience.";

const FORBIDDEN_CLAIM_PATTERNS = [
  /fully anonymous/i,
  /HIPAA/i,
  /never shared/i,
  /military-grade/i,
  /guaranteed deletion/i,
  /we guarantee/i,
  /certified/i,
  /compliant with/i,
];

export interface PrivacySection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export const PRIVACY_OWNER_REVIEW_BANNER =
  "This page is an owner/legal review draft. It describes current NVRTRACK product behavior as implemented in the app. It is not a finalized legal policy and does not claim compliance with any privacy law.";

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: "overview",
    title: "What this notice covers",
    paragraphs: [
      "NVRTRACK is a personal fitness tracking web app. You create an account and log training, nutrition, body metrics, and related notes for your own use.",
      "This draft explains what the app collects and stores today, how that information is used in the product, and which controls currently exist. It is based on the current codebase, not on intended future features.",
    ],
  },
  {
    id: "account",
    title: "Account and authentication",
    paragraphs: [
      "To use NVRTRACK you sign up with an email address and password. Authentication is handled by Supabase Auth. NVRTRACK stores a profile row tied to your account id when the account is created.",
      "The app does not currently show your email on the Profile screen. Email and password credentials are processed by Supabase Auth. The app does not implement social login, phone auth, or third-party identity providers in the current code.",
    ],
  },
  {
    id: "profile",
    title: "Profile information",
    paragraphs: [
      "Your profile can include a display name, height, preferred weight unit, timezone, and optional calorie and macro goals (calories, protein, carbohydrate, fat).",
      "Display name, height, unit, timezone, and nutrition goals are shown in Profile and used in the app UI (for example, calorie goals on Home and Nutrition, and weight-unit display). Height is stored and shown on Profile. The current nutrition calculators do not use height to compute calorie needs.",
    ],
  },
  {
    id: "onboarding",
    title: "Onboarding answers",
    paragraphs: [
      "During onboarding, NVRTRACK asks a short set of questions and saves the answers on your profile. Question screens use a step identifier in the URL (for example q=goal). The URL does not include the answer you selected.",
      "Height is optional during onboarding. Other onboarding questions require a choice, including “Prefer not to answer” where that option exists.",
    ],
    bullets: [
      "Primary goal — stored on your profile and shown in Profile → Training Preferences. Not currently used to generate workouts or meal plans.",
      "Training experience — stored and shown in Training Preferences. Not currently used to generate workouts.",
      "Desired training days — stored and shown in Training Preferences. Not currently used to build your weekly schedule automatically.",
      "Training environment — stored and shown in Training Preferences. Not currently used to filter exercises or plans.",
      "Discovery source (how you heard about NVRTRACK) — stored and shown in Training Preferences. The app does not currently use this field for recommendations, analytics dashboards, or marketing.",
      "Onboarding completion version and timestamp — stored to decide whether to show onboarding or the main app.",
    ],
  },
  {
    id: "tracking-data",
    title: "Information you log in the app",
    paragraphs: [
      "After you sign in, you can create and manage the following records. They are stored in your account’s database rows (and, for progress photos, in private object storage). Other users cannot read these rows under the current Row Level Security policies, which allow access only when the signed-in user owns the row.",
    ],
    bullets: [
      "Body-weight entries (weight, unit, date, optional note) — used on Home and Progress charts. You can create, edit, and delete individual entries.",
      "Nutrition logs and saved foods (food names, amounts, meals, dates, optional notes, catalog or USDA-derived nutrient snapshots) — used on Nutrition and Home totals. You can edit or delete entries and saved foods.",
      "Workout history (workout names, dates, notes, exercises, sets, weights, reps) — used on Training, Home, and history views. You can delete workouts and related records through the training UI.",
      "Workout templates and weekday schedules — used by the planner. You can create and change these in Training.",
      "Strength / PR figures — derived in the app from your logged sets (estimated one-rep max). They are not a separate uploaded dataset.",
      "Progress photos (image file, date, view, optional weight and note) — stored in a private Supabase Storage bucket with ownership policies. You can delete a photo and its file from Progress.",
      "Body measurements — stored as your entries and shown on Progress. You can delete individual entries.",
      "Weekly journal entries — stored as your text notes and shown on Progress. You can delete individual entries.",
      "In-app notification preferences and inbox items — stored in the database and shown on Profile. These are in-app records in the current code, not email or push-notification delivery.",
    ],
  },
  {
    id: "use",
    title: "How NVRTRACK uses this information",
    paragraphs: [
      "NVRTRACK uses the information you provide to operate the product for you: sign you in, show your logs, compute totals and training summaries, remember onboarding completion, and keep your settings.",
      "The current application code does not include advertising, behavioral ad targeting, session replay, or product-analytics SDKs.",
    ],
  },
  {
    id: "storage",
    title: "Where information is stored and processed",
    paragraphs: [
      "Account, profile, logs, photos metadata, and related records are stored in a Supabase project (Postgres database, Auth, and Storage). The app talks to Supabase from the server and the browser using the project URL and the public anonymous key, with user sessions in cookies.",
      "The web application is a Next.js app. The production host is an operator choice. [Owner review: confirm the Production hosting provider. If the app is hosted on Vercel, that provider processes HTTP requests and standard hosting logs. This repository does not include the @vercel/analytics package.]",
      "When you search live USDA foods while signed in, the NVRTRACK server sends the search text (and related search parameters) to the USDA FoodData Central API. The search request does not include your email or profile fields. Results may be cached briefly in server memory to reduce repeat lookups.",
      "The app loads the Geist typeface through Next.js font loading, which self-hosts the font files in the built application rather than loading them from the browser as a separate analytics SDK.",
    ],
  },
  {
    id: "sharing",
    title: "Sharing, sale, and advertising",
    paragraphs: [
      "NVRTRACK does not include a feature that sells your information or that shows third-party ads.",
      "Service providers that the current product actually calls are: Supabase (auth, database, storage), the USDA FoodData Central API for signed-in food search, and whatever host serves the Next.js app. Those providers process data only as needed to provide those services.",
      "This draft does not claim that information stays only on your device. Hosting, database, and USDA search necessarily involve those processors. [Owner review: list any additional processors used in Production that are not in this repository, such as email delivery for Supabase Auth confirmations, error monitoring, or platform logs.]",
    ],
  },
  {
    id: "controls",
    title: "Access, edit, and delete options that exist today",
    paragraphs: [
      "You can view and edit profile fields (display name, height, nutrition goals, unit, timezone) in Profile. You can view and edit onboarding answers in Profile → Training Preferences. You can change those answers to another allowed option, including “Prefer not to answer” where that option exists. The Training Preferences form still requires a selected option for each onboarding question; it does not offer a “delete all onboarding answers” control.",
      "You can create, edit, and delete individual weight entries, food entries, saved foods, workouts, progress photos, body measurements, and journal entries in the corresponding screens.",
      "You can log out from Profile.",
      "NVRTRACK does not currently provide an in-app account deletion flow, a full data-export download, or a privacy-request form. Deleting the Auth user in the database would cascade to owned rows because tables reference auth.users with ON DELETE CASCADE, but that is an operator/database action, not a user-facing product feature. [Owner review: if Production needs account deletion or export, that still has to be built.]",
    ],
  },
  {
    id: "security",
    title: "Security practices we can describe from the implementation",
    paragraphs: [
      "Sign-in is required for app routes other than public pages such as Login, Signup, and this Privacy page.",
      "Database tables used for user records enable Row Level Security with policies that match the signed-in user id. Progress photos use a private storage bucket with ownership policies in the migrations.",
      "The USDA API key is read from a server environment variable and is not used as a browser-side SDK.",
      "These controls reduce casual cross-user access in the app. They are not a guarantee that data cannot be lost, accessed, or disclosed. This notice does not claim “military-grade encryption,” certifications, or guaranteed security.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      "NVRTRACK does not currently publish an in-app support email, contact form, or privacy-request address. [Owner review: add a contact method before relying on this notice in Production if you want users to reach you.]",
    ],
  },
  {
    id: "changes",
    title: "Changes",
    paragraphs: [
      "If collection, processors, or user controls change, this notice should be updated to match the product. This draft does not set a guaranteed update schedule.",
    ],
  },
];

export const PRIVACY_OWNER_REVIEW_QUESTIONS: string[] = [
  "Is the Production host Vercel or another provider, and should platform logs or optional Vercel Analytics (not present in this repo) be disclosed?",
  "Does Supabase Auth send confirmation or recovery email through a third-party mail provider that should be named?",
  "Should discovery_source continue to be collected? It is stored and editable but is not used by any in-app feature besides display.",
  "Primary goal, experience, desired days, and training environment are stored and shown, but they do not currently drive workout or nutrition generation. Confirm the product purpose before Production.",
  "Height is stored and displayed; nutrition math does not currently use it. Confirm whether that is enough purpose to keep collecting it at onboarding.",
  "Fitness logs (weight, photos, measurements, training, food) can be sensitive. Owner/legal should decide whether consumer health/fitness privacy rules apply. This draft does not conclude that they do or do not.",
  "There is no user-facing account deletion, data export, or privacy contact. Confirm whether those are required before Production.",
  "Should a forced consent checkbox be added later? This version does not add one because no separate legal/product requirement was established in the app.",
  "Do not treat this page as a health-privacy, consumer-privacy, or similar compliance determination by itself. Those determinations need owner/legal review.",
];

export function getPrivacyNoticePlainText(): string {
  const parts = [
    PRIVACY_NOTICE_TITLE,
    PRIVACY_NOTICE_STATUS,
    PRIVACY_NOTICE_EFFECTIVE_DATE,
    PRIVACY_OWNER_REVIEW_BANNER,
    PRIVACY_ONBOARDING_CONTEXT,
    ...PRIVACY_SECTIONS.flatMap((section) => [
      section.title,
      ...section.paragraphs,
      ...(section.bullets ?? []),
    ]),
    ...PRIVACY_OWNER_REVIEW_QUESTIONS,
  ];
  return parts.join("\n");
}

export function findForbiddenPrivacyClaims(text: string = getPrivacyNoticePlainText()): string[] {
  return FORBIDDEN_CLAIM_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}
