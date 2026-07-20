"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-white/10 bg-[#090b0d] px-4 py-6 md:block">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Fitness Tracker</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">NVRTRACK</h1>
      </div>
      <nav aria-label="Primary">
        <ul className="space-y-2">
          {NAV_ITEMS.map((item) => {
            const active = isRouteActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active ? "border border-white/15 bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
