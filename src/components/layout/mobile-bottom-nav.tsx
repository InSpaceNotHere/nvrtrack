"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/components/ui/cn";
import { NAV_ITEMS } from "@/lib/navigation";

function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden" aria-label="Primary">
      <div className="mx-auto w-full max-w-lg px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
        <ul className="grid grid-cols-5 rounded-[var(--ds-radius-xl)] border border-white/10 bg-[var(--ds-color-bg-surface)] p-1.5 shadow-[var(--ds-shadow-lg)]">
        {NAV_ITEMS.map((item) => {
          const active = isRouteActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "ds-press flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[0.7rem] text-[10px] transition-colors",
                  active
                    ? "bg-[var(--ds-color-bg-elevated)] text-white"
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300 active:bg-white/10",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn("h-4 w-4", active ? "stroke-[2.2] text-[var(--ds-color-accent)]" : "")}
                  aria-hidden="true"
                />
                <span className="font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
        </ul>
      </div>
    </nav>
  );
}
