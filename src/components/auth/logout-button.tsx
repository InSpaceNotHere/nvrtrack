"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setError(null);

    if (!supabase) {
      setError("Supabase environment variables are missing.");
      return;
    }

    setLoading(true);
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError("Unable to log out right now. Please try again.");
      setLoading(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-400/35 px-4 text-sm font-medium text-rose-200 transition-colors hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Logging out..." : "Log Out"}
      </button>
      {error ? (
        <p role="alert" className="text-xs text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
