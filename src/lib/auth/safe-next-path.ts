export function sanitizeNextPath(input: string | null | undefined): string {
  if (!input) {
    return "/";
  }
  const candidate = input.trim();
  if (!candidate.startsWith("/")) {
    return "/";
  }
  if (candidate.startsWith("//")) {
    return "/";
  }
  if (candidate.includes("\\") || candidate.includes("\u0000")) {
    return "/";
  }

  let decoded = candidate;
  try {
    decoded = decodeURIComponent(candidate);
  } catch {
    return "/";
  }
  if (decoded.includes("\\") || decoded.startsWith("//")) {
    return "/";
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate, "http://localhost");
  } catch {
    return "/";
  }
  if (parsed.origin !== "http://localhost") {
    return "/";
  }
  if (!parsed.pathname.startsWith("/")) {
    return "/";
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
