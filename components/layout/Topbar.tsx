"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { getPageTitle } from "@/lib/nav";
import { roleLabel } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronDown, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface TopbarProps {
  sidebarCollapsed: boolean;
}

export function Topbar({ sidebarCollapsed }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [now, setNow] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const title = getPageTitle(pathname);
  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(-2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <header
      className={cn(
        "fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-100 bg-white/95 px-4 backdrop-blur-sm sm:px-6",
        "left-0 transition-[left] duration-sidebar ease-in-out lg:left-sidebar-expanded",
        sidebarCollapsed && "lg:left-sidebar-collapsed"
      )}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <h1 className="truncate text-lg font-semibold text-black">{title}</h1>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium tabular-nums text-black">
            {format(now, "HH:mm:ss")}
          </p>
          <p className="text-xs capitalize text-neutral-500">
            {format(now, "EEEE, dd/MM/yyyy", { locale: vi })}
          </p>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu tài khoản"
            aria-expanded={menuOpen}
            className="flex min-h-[44px] items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              {initials}
            </span>
            <span className="hidden max-w-[140px] truncate text-sm font-medium text-black lg:inline">
              {user?.name}
            </span>
            <ChevronDown className="hidden h-4 w-4 text-neutral-400 lg:block" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-52 overflow-hidden rounded-lg border border-neutral-100 bg-white py-1 shadow-lg"
            >
              <div className="border-b border-neutral-100 px-3 py-2 lg:hidden">
                <p className="truncate text-sm font-medium text-black">
                  {user?.name}
                </p>
                <p className="text-xs text-neutral-500">
                  {roleLabel(user?.role)}
                </p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full min-h-[44px] items-center gap-2 px-3 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-primary focus-visible:bg-neutral-50 focus-visible:outline-none"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
