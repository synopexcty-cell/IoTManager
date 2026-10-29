"use client";

import { getNavItems } from "@/lib/nav";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Fingerprint } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  role: Role;
}

export function Sidebar({ collapsed, onToggle, role }: SidebarProps) {
  const pathname = usePathname();
  const items = getNavItems(role);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-neutral-100 bg-white lg:flex",
        "transition-[width] duration-sidebar ease-in-out",
        collapsed ? "w-sidebar-collapsed" : "w-sidebar-expanded"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-neutral-100 px-4",
          collapsed ? "justify-center" : "justify-between gap-2"
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2.5 overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            collapsed && "justify-center"
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
            <Fingerprint className="h-5 w-5" aria-hidden />
          </span>
          {!collapsed && (
            <span className="truncate text-base font-bold tracking-tight text-black">
              ChấmCông
            </span>
          )}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Thu gọn menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center py-2">
          <button
            type="button"
            onClick={onToggle}
            aria-label="Mở rộng menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Menu chính">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-11 min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                collapsed && "justify-center px-0",
                active
                  ? "bg-primary-light text-primary"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-black"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  active ? "text-primary" : "text-neutral-500 group-hover:text-black"
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {collapsed && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-black px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:block group-hover:opacity-100 group-focus-visible:block group-focus-visible:opacity-100"
                >
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
