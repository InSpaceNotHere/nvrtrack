import Link from "next/link";

import { cn } from "@/components/ui/cn";

export function PrivacyLink({ className }: { className?: string }) {
  return (
    <Link
      href="/privacy"
      className={cn(
        "font-medium text-zinc-300 underline decoration-zinc-600 underline-offset-2 transition-colors hover:text-zinc-100",
        className,
      )}
    >
      Privacy
    </Link>
  );
}
