"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { cn } from "@/components/ui/cn";
import { MORE_NAV_ITEM, MORE_NAV_ITEMS, PRIMARY_NAV_ITEMS, type AppNavigationItem } from "@/lib/navigation";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function moreActive(pathname: string): boolean {
  return MORE_NAV_ITEMS.some((item) => isActive(pathname, item.href));
}

function NavLink({ item, pathname, compact = false }: { item: AppNavigationItem; pathname: string; compact?: boolean }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "ds-press flex items-center gap-3 rounded-2xl px-3 text-[15px] font-medium",
        compact ? "min-h-14 flex-col justify-center gap-1 px-1 text-[13px]" : "min-h-12",
        active ? "bg-[#E8F5EF] text-[#17785E]" : "text-[#65706B] hover:bg-white/70 hover:text-[#17201D]",
      )}
    >
      <Icon className={cn("h-5 w-5", active ? "text-[#17785E]" : "text-[#65706B]")} aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}

function MorePanel({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  return (
    <ul className="space-y-1">
      {MORE_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-2xl px-3 text-base",
                active ? "bg-[#E8F5EF] text-[#17785E]" : "text-[#17201D]",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function DesktopSidebar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const MoreIcon = MORE_NAV_ITEM.icon;
  const activeMore = moreActive(pathname);

  return (
    <aside className="nvr-rail sticky top-4 z-30 ml-4 mt-4 hidden h-[calc(100vh-2rem)] w-[200px] shrink-0 flex-col rounded-[28px] border border-[rgba(23,32,29,0.06)] px-3 py-4 md:flex">
      <div className="px-3 pb-6 pt-2">
        <p className="text-[15px] font-semibold tracking-tight text-[#17201D]">NVRTRACK</p>
      </div>
      <nav aria-label="Primary" className="flex flex-1 flex-col">
        <ul className="space-y-1">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <NavLink item={item} pathname={pathname} />
            </li>
          ))}
        </ul>
        <div className="relative mt-auto">
          <button
            type="button"
            className={cn(
              "ds-press flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-[15px] font-medium",
              activeMore ? "bg-[#E8F5EF] text-[#17785E]" : "text-[#65706B] hover:bg-white/70",
            )}
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
          >
            <MoreIcon className="h-5 w-5" aria-hidden="true" />
            More
          </button>
          {moreOpen ? (
            <div className="absolute bottom-14 left-0 w-56 rounded-[24px] border border-[rgba(23,32,29,0.06)] bg-white/90 p-2 shadow-[0_22px_60px_rgba(23,32,29,0.12)] backdrop-blur-xl">
              <MorePanel pathname={pathname} onNavigate={() => setMoreOpen(false)} />
            </div>
          ) : null}
        </div>
      </nav>
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const MoreIcon = MORE_NAV_ITEM.icon;
  const activeMore = moreActive(pathname);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.7rem+env(safe-area-inset-bottom))] md:hidden">
      <nav aria-label="Primary" className="nvr-dock mx-auto max-w-md rounded-[28px] border border-white/70 p-1.5">
        <ul className="grid grid-cols-4">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <NavLink item={item} pathname={pathname} compact />
            </li>
          ))}
          <li>
            <button
              type="button"
              className={cn(
                "ds-press flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-2xl text-[13px] font-medium",
                activeMore ? "bg-[#E8F5EF] text-[#17785E]" : "text-[#65706B]",
              )}
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen(true)}
            >
              <MoreIcon className="h-5 w-5" aria-hidden="true" />
              More
            </button>
          </li>
        </ul>
      </nav>
      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <MorePanel pathname={pathname} onNavigate={() => setMoreOpen(false)} />
      </BottomSheet>
    </div>
  );
}
