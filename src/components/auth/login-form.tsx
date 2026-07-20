"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { mapAuthErrorMessage } from "@/lib/auth/errors";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginForm() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    if (!supabase) {
      setError("Supabase environment variables are missing. Configure .env.local to continue.");
      return;
    }

    setLoading(true);
    let navigated = false;

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        setError(mapAuthErrorMessage(signInError.message));
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Login succeeded but session could not be established. Please try again.");
        return;
      }

      navigated = true;
      window.location.assign("/");
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unable to complete authentication right now.";
      setError(mapAuthErrorMessage(message));
    } finally {
      if (!navigated) {
        setLoading(false);
      }
    }
  }

  return (
    <section className="rounded-[1.1rem] border border-white/10 bg-[#101215] p-4 sm:p-5">
      <header className="mb-4">
        <p className="text-xs font-medium uppercase tracking-[0.13em] text-zinc-500">NVRTRACK</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">Log in</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <label className="block space-y-1.5 text-sm text-zinc-300">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className="app-input"
            required
          />
        </label>

        <label className="block space-y-1.5 text-sm text-zinc-300">
          <span>Password</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="app-input pr-16"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {error ? (
          <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>

      <p className="mt-4 text-sm text-zinc-400">
        New here?{" "}
        <Link href="/signup" className="font-medium text-white underline decoration-white/30 underline-offset-2">
          Create an account
        </Link>
      </p>
    </section>
  );
}
