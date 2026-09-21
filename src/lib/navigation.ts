import { Activity, Dumbbell, Home, Salad, User } from "lucide-react";

import type { NavigationItem } from "@/types/fitness";

export const NAV_ITEMS: NavigationItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/nutrition", label: "Nutrition", icon: Salad },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/progress", label: "Progress", icon: Activity },
  { href: "/profile", label: "Profile", icon: User },
];
