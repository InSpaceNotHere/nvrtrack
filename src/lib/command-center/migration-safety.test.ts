import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("command center foundation migration", () => {
  const sql = readFileSync(
    new URL("../../../supabase/migrations/20261008054754_add_command_center_foundation.sql", import.meta.url),
    "utf8",
  );

  it("is additive and does not drop fitness tables", () => {
    expect(sql).toContain("create table if not exists public.organizations");
    expect(sql).toContain("create table if not exists public.organization_members");
    expect(sql).toContain("create table if not exists public.opportunities");
    expect(sql).toContain("create table if not exists public.business_tasks");
    expect(sql).toContain("create table if not exists public.activity_events");
    expect(sql.toLowerCase()).not.toMatch(/drop table/);
    expect(sql).not.toContain("weight_entries");
    expect(sql).not.toContain("food_entries");
    expect(sql).not.toContain("workouts");
  });

  it("keeps membership helpers out of the public schema", () => {
    expect(sql).toContain("create schema if not exists private");
    expect(sql).toContain("private.is_organization_member");
    expect(sql).not.toMatch(/create or replace function public\.is_organization_member/i);
  });
});
