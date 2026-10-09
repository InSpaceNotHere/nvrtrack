export const POST_AUTH_HOME = "/today";

export const BUSINESS_ROUTE_PREFIXES = [
  "/today",
  "/businesses",
  "/opportunities",
  "/implementations",
  "/tasks",
  "/results",
  "/activity",
  "/ai",
  "/account",
] as const;

export const LEGACY_FITNESS_ROUTE_PREFIXES = [
  "/nutrition",
  "/training",
  "/progress",
  "/profile",
  "/onboarding",
] as const;

export function isBusinessRoute(pathname: string): boolean {
  if (pathname === "/" || pathname === POST_AUTH_HOME) {
    return true;
  }

  return BUSINESS_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
