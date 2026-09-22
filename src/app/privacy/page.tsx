import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import {
  linkifyContactEmails,
  PRIVACY_NOTICE_LAST_UPDATED,
  PRIVACY_NOTICE_TITLE,
  PRIVACY_SECTIONS,
} from "@/lib/privacy/notice";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Privacy — NVRTRACK",
  description: "How NVRTRACK collects and uses account, training, and progress information.",
};

function PrivacyParagraph({ text }: { text: string }) {
  const parts = linkifyContactEmails(text);
  const nodes: ReactNode[] = parts.map((part, index) => {
    if (part.type === "mailto") {
      return (
        <a
          key={`${part.value}-${index}`}
          href={`mailto:${part.value}`}
          className="font-medium text-white underline decoration-white/30 underline-offset-2"
        >
          {part.value}
        </a>
      );
    }
    return <span key={`text-${index}`}>{part.value}</span>;
  });
  return <p className="text-sm leading-relaxed text-zinc-300">{nodes}</p>;
}

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
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.13em] text-zinc-500">NVRTRACK</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{PRIVACY_NOTICE_TITLE}</h1>
      <p className="mt-2 text-sm text-zinc-400">Last updated: {PRIVACY_NOTICE_LAST_UPDATED}</p>

      <div className="mt-8 space-y-8">
        {PRIVACY_SECTIONS.map((section) => (
          <section key={section.id} className="space-y-3" aria-labelledby={section.id}>
            <h2 id={section.id} className="text-lg font-semibold text-zinc-100">
              {section.title}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <PrivacyParagraph key={paragraph} text={paragraph} />
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
