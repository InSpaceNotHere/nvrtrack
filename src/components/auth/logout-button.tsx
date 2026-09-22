"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface LogoutButtonProps {
  compact?: boolean;
}

export function LogoutButton({ compact = false }: LogoutButtonProps) {
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
        className={`inline-flex items-center justify-center rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
          compact
            ? "h-8 border border-white/15 px-3 text-xs text-zinc-300 hover:bg-white/10"
            : "h-10 border border-rose-400/35 px-4 text-sm text-rose-200 hover:bg-rose-500/10"
        }`}
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
