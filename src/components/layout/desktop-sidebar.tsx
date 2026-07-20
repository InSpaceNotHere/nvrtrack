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
    <aside className="sticky top-0 hidden h-screen w-52 shrink-0 border-r border-white/8 bg-[#050607] px-3 py-5 md:block">
      <div className="mb-6 px-2">
        <h1 className="text-xl font-semibold tracking-tight text-white">NVRTRACK</h1>
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
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
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
