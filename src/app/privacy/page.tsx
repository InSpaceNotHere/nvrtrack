import Link from "next/link";
import type { Metadata } from "next";

import {
  PRIVACY_NOTICE_EFFECTIVE_DATE,
  PRIVACY_NOTICE_STATUS,
  PRIVACY_NOTICE_TITLE,
  PRIVACY_OWNER_REVIEW_BANNER,
  PRIVACY_OWNER_REVIEW_QUESTIONS,
  PRIVACY_SECTIONS,
} from "@/lib/privacy/notice";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Privacy — NVRTRACK",
  description: "Owner-review draft describing what NVRTRACK collects and how it is used in the current product.",
};

export default async function PrivacyPage() {
  const supabase = await createServerSupabaseClient();
  let signedIn = false;
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.13em] text-zinc-500">NVRTRACK</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{PRIVACY_NOTICE_TITLE}</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Draft date: {PRIVACY_NOTICE_EFFECTIVE_DATE}. Status: {PRIVACY_NOTICE_STATUS.replaceAll("_", " ")}.
      </p>

      <p
        className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm leading-relaxed text-amber-100"
        role="note"
      >
        {PRIVACY_OWNER_REVIEW_BANNER}
      </p>

      <div className="mt-8 space-y-8">
        {PRIVACY_SECTIONS.map((section) => (
          <section key={section.id} className="space-y-3" aria-labelledby={section.id}>
            <h2 id={section.id} className="text-lg font-semibold text-zinc-100">
              {section.title}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-zinc-300">
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-300">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <section className="space-y-3 rounded-xl border border-white/10 bg-black/25 p-4" aria-labelledby="owner-review">
          <h2 id="owner-review" className="text-lg font-semibold text-zinc-100">
            Owner / legal review notes
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400">
            These questions are for the owner and legal reviewer. They are not legal conclusions.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-300">
            {PRIVACY_OWNER_REVIEW_QUESTIONS.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </section>
      </div>

      <p className="mt-10 text-sm text-zinc-400">
        {signedIn ? (
          <Link href="/" className="font-medium text-white underline decoration-white/30 underline-offset-2">
            Back to app
          </Link>
        ) : (
          <>
            <Link href="/login" className="font-medium text-white underline decoration-white/30 underline-offset-2">
              Log in
            </Link>
            <span className="px-2 text-zinc-600">·</span>
            <Link href="/signup" className="font-medium text-white underline decoration-white/30 underline-offset-2">
              Create an account
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
