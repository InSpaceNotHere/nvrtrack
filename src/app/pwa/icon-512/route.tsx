import { createPwaIconResponse } from "@/lib/pwa/icon-response";

export const dynamic = "force-static";

export function GET() {
  return createPwaIconResponse(512);
}
