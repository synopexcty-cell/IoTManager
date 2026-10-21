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
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/attendance", label: "Chấm công", icon: Clock },
  { href: "/history", label: "Lịch sử", icon: History },
  { href: "/ot", label: "Lịch OT", icon: Timer },
  { href: "/meals", label: "Ăn ngoài", icon: Utensils },
  { href: "/employees", label: "Nhân viên", icon: Users, adminOnly: true },
  { href: "/settings", label: "Cài đặt", icon: Settings, adminOnly: true },
];

export function getNavItems(isAdmin: boolean): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
}

export function isAdminOnlyPath(pathname: string): boolean {
  return NAV_ITEMS.some(
    (item) =>
      item.adminOnly &&
      (pathname === item.href || pathname.startsWith(item.href + "/"))
  );
}

export function getPageTitle(pathname: string): string {
  const item = NAV_ITEMS.find(
    (n) => pathname === n.href || pathname.startsWith(n.href + "/")
  );
  return item?.label ?? "Chấm công";
}
