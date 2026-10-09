import { Bot, Briefcase, CheckSquare, LayoutDashboard, LineChart, ListTodo, MoreHorizontal, Sparkles, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AppNavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV_ITEMS: AppNavigationItem[] = [
  { href: "/today", label: "Today", icon: LayoutDashboard },
  { href: "/tasks", label: "Work", icon: CheckSquare },
  { href: "/opportunities", label: "Opportunities", icon: Sparkles },
];

export const MORE_NAV_ITEMS: AppNavigationItem[] = [
  { href: "/businesses", label: "Business", icon: Briefcase },
  { href: "/results", label: "Results", icon: LineChart },
  { href: "/activity", label: "Activity", icon: ListTodo },
  { href: "/ai", label: "AI", icon: Bot },
  { href: "/account", label: "Account", icon: User },
];

export const MORE_NAV_ITEM: AppNavigationItem = {
  href: "#more",
  label: "More",
  icon: MoreHorizontal,
};

export const DESKTOP_NAV_ITEMS = PRIMARY_NAV_ITEMS;
export const MOBILE_NAV_ITEMS = PRIMARY_NAV_ITEMS;
export const MOBILE_MORE_NAV_ITEMS = MORE_NAV_ITEMS;
export const MOBILE_MORE_ITEM = MORE_NAV_ITEM;
export const NAV_ITEMS = PRIMARY_NAV_ITEMS;
