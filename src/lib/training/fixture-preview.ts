export function allowNonProductionFixturePreview(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.VERCEL_ENV === "production") {
    return false;
  }
  if (env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "development") {
    return true;
  }
  return env.NODE_ENV !== "production";
}

export function resolveNonProductionFixtureParam<T extends string>(
  param: string | undefined,
  isFixture: (value: string | undefined) => value is T,
  env: NodeJS.ProcessEnv = process.env,
): T | null {
  if (!allowNonProductionFixturePreview(env)) {
    return null;
  }
  return isFixture(param) ? param : null;
}
