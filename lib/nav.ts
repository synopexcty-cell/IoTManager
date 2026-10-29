import type { Role } from "./types";
import {
  Clock,
  History,
  LayoutDashboard,
  Settings,
  Timer,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Nếu có — chỉ những vai trò này thấy menu / vào được trang */
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/attendance",
    label: "Chấm công",
    icon: Clock,
    roles: ["admin", "employee"],
  },
  { href: "/history", label: "Công SIFLEX", icon: History },
  { href: "/ot", label: "Lịch OT", icon: Timer },
  { href: "/meals", label: "Ăn ngoài", icon: Utensils },
  { href: "/employees", label: "Nhân viên", icon: Users, roles: ["admin"] },
  { href: "/settings", label: "Cài đặt", icon: Settings, roles: ["admin"] },
];

function matchesPath(item: NavItem, pathname: string) {
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export function getNavItems(role: Role): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  );
}

export function isForbiddenPath(pathname: string, role: Role): boolean {
  const item = NAV_ITEMS.find((n) => matchesPath(n, pathname));
  if (!item?.roles) return false;
  return !item.roles.includes(role);
}

export function isAdminOnlyPath(pathname: string): boolean {
  return isForbiddenPath(pathname, "employee");
}

export function getPageTitle(pathname: string): string {
  const item = NAV_ITEMS.find(
    (n) => pathname === n.href || pathname.startsWith(n.href + "/")
  );
  return item?.label ?? "Chấm công";
}
