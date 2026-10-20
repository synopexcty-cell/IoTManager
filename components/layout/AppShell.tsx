"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { isAdminOnlyPath } from "@/lib/nav";
import { flushOfflineQueue, listEmployees } from "@/lib/sheets";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const SIDEBAR_KEY = "chamcong_sidebar_collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.mustChangePassword) {
      router.replace("/change-password");
      return;
    }
    if (user.role !== "admin" && isAdminOnlyPath(pathname)) {
      router.replace("/dashboard");
    }
  }, [loading, user, router, pathname]);

  useEffect(() => {
    if (!user) return;
    // Prefetch danh sách NV vào cache — trang khác mở nhanh hơn
    void listEmployees();
    flushOfflineQueue().then(({ success }) => {
      if (success > 0) {
        toast(`Đã đồng bộ ${success} thao tác offline`, "success");
      }
    });
  }, [user, toast]);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  if (loading || !ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isAdmin = user.role === "admin";
  const blockPage = !isAdmin && isAdminOnlyPath(pathname);

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar
        collapsed={collapsed}
        onToggle={toggleSidebar}
        isAdmin={isAdmin}
      />
      <Topbar sidebarCollapsed={collapsed} />
      <main
        className={cn(
          "min-h-screen pt-16 transition-[padding] duration-sidebar ease-in-out",
          "pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-6",
          "lg:pl-sidebar-expanded",
          collapsed && "lg:pl-sidebar-collapsed"
        )}
      >
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          {blockPage ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            children
          )}
        </div>
      </main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
