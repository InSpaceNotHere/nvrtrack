const AUTH_ROUTES = new Set(["/login", "/signup"]);
const PUBLIC_EXACT_ROUTES = new Set(["/privacy", "/login", "/signup"]);
const PUBLIC_PREFIXES = ["/privacy/", "/auth/"] as const;
const PROTECTED_ROUTE_PREFIXES = ["/", "/nutrition", "/training", "/progress", "/profile", "/onboarding"] as const;

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.has(pathname);
}

export function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_EXACT_ROUTES.has(pathname)) {
    return true;
  }

  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isProtectedRoute(pathname: string): boolean {
  if (isPublicRoute(pathname)) {
    return false;
  }

  if (pathname === "/") {
    return true;
  }

  return PROTECTED_ROUTE_PREFIXES.filter((route) => route !== "/").some((route) => pathname.startsWith(route));
}
