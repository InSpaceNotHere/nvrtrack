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

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b0d10]/95 backdrop-blur md:hidden">
      <ul className="mx-auto grid w-full max-w-xl grid-cols-5 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
        {NAV_ITEMS.map((item) => {
          const active = isRouteActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors ${
                  active ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200"
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
  );
}
