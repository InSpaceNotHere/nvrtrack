"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

let browserClient: SupabaseClient<Database> | null = null;

export function createBrowserSupabaseClient(): SupabaseClient<Database> | null {
  if (browserClient) {
    return browserClient;
  }

  const env = getSupabasePublicEnv();
  if (!env) {
    return null;
  }

  browserClient = createBrowserClient<Database>(env.url, env.anonKey);
  return browserClient;
}
