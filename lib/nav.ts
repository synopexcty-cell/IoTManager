import {
  Clock,
  History,
  LayoutDashboard,
  Settings,
  Users,
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
  { href: "/employees", label: "Nhân viên", icon: Users, adminOnly: true },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

export function getNavItems(isAdmin: boolean): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
}

export function getPageTitle(pathname: string): string {
  const item = NAV_ITEMS.find(
    (n) => pathname === n.href || pathname.startsWith(n.href + "/")
  );
  return item?.label ?? "Chấm công";
}
