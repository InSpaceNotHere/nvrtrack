import { Activity, Dumbbell, Home, LayoutDashboard, Salad, User } from "lucide-react";

import type { NavigationItem } from "@/types/fitness";

export const NAV_ITEMS: NavigationItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/nutrition", label: "Nutrition", icon: Salad },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/progress", label: "Progress", icon: Activity },
  { href: "/profile", label: "Profile", icon: User },
];

export const COMMAND_CENTER_NAV_ITEMS: Array<Omit<NavigationItem, "href"> & { href: "/today" }> = [
  { href: "/today", label: "Today", icon: LayoutDashboard },
];
