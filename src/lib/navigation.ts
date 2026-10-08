import {
  Bot,
  Briefcase,
  CheckSquare,
  LayoutDashboard,
  LineChart,
  ListTodo,
  MoreHorizontal,
  Sparkles,
  User,
  Waypoints,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AppNavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const DESKTOP_NAV_ITEMS: AppNavigationItem[] = [
  { href: "/today", label: "Today", icon: LayoutDashboard },
  { href: "/businesses", label: "Businesses", icon: Briefcase },
  { href: "/opportunities", label: "Opportunities", icon: Sparkles },
  { href: "/implementations", label: "Implementations", icon: Waypoints },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/results", label: "Results", icon: LineChart },
  { href: "/activity", label: "Activity", icon: ListTodo },
  { href: "/ai", label: "AI", icon: Bot },
  { href: "/account", label: "Account", icon: User },
];

export const MOBILE_NAV_ITEMS: AppNavigationItem[] = [
  { href: "/today", label: "Today", icon: LayoutDashboard },
  { href: "/opportunities", label: "Opportunities", icon: Sparkles },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
];

export const MOBILE_MORE_NAV_ITEMS: AppNavigationItem[] = [
  { href: "/businesses", label: "Businesses", icon: Briefcase },
  { href: "/implementations", label: "Implementations", icon: Waypoints },
  { href: "/results", label: "Results", icon: LineChart },
  { href: "/activity", label: "Activity", icon: ListTodo },
  { href: "/ai", label: "AI", icon: Bot },
  { href: "/account", label: "Account", icon: User },
];

export const MOBILE_MORE_ITEM: AppNavigationItem = {
  href: "#more",
  label: "More",
  icon: MoreHorizontal,
};

export const NAV_ITEMS = DESKTOP_NAV_ITEMS;
