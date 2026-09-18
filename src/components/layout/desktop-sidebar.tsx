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

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-white/8 bg-[var(--ds-color-bg-muted)] px-4 py-4 md:block">
      <div className="mb-5 rounded-[var(--ds-radius-lg)] border border-white/10 bg-[var(--ds-color-bg-surface)] px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">NVRTRACK</p>
        <h1 className="mt-1 text-base font-semibold tracking-tight text-white">Training OS</h1>
      </div>
      <nav aria-label="Primary">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isRouteActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[var(--ds-radius-md)] border px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "border-white/10 bg-[var(--ds-color-bg-elevated)] text-white"
                      : "border-transparent text-zinc-500 hover:border-white/10 hover:bg-white/[0.03] hover:text-zinc-200",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    className={cn("h-3.5 w-3.5", active ? "text-[var(--ds-color-accent)]" : "text-zinc-500")}
                    aria-hidden="true"
                  />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
