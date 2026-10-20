"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { getQueue } from "@/lib/offline-queue";
import { flushOfflineQueue } from "@/lib/sheets";
import { AlertTriangle, Database, LogOut, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [dbOk, setDbOk] = useState<boolean | null>(null);

  useEffect(() => {
    setQueueCount(getQueue().length);
    fetch("/api/sheets")
      .then(async (res) => {
        const data = await res.json();
        setDbOk(res.ok && data.ok === true);
      })
      .catch(() => setDbOk(false));
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { success, failed } = await flushOfflineQueue();
      setQueueCount(getQueue().length);
      if (success > 0) {
        toast(`Đã đồng bộ ${success} thao tác`, "success");
      } else if (failed > 0) {
        toast("Đồng bộ thất bại — vẫn mất kết nối", "error");
      } else {
        toast("Không có thao tác nào trong hàng đợi", "info");
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tài khoản</CardTitle>
          <CardDescription>Thông tin đăng nhập hiện tại</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Họ tên</span>
            <span className="font-medium text-black">{user?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Vai trò</span>
            <span className="font-medium text-black">
              {user?.role === "admin" ? "Quản trị" : "Nhân viên"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-neutral-400" />
            Kết nối dữ liệu
          </CardTitle>
          <CardDescription>
            MongoDB Atlas và hàng đợi offline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-neutral-50 px-4 py-3">
            {dbOk === false ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-black">
                    Không kết nối được DB
                  </p>
                  <p className="text-xs text-neutral-500">
                    Kiểm tra MONGODB_URI trên Vercel / .env.local
                  </p>
                </div>
              </>
            ) : (
              <>
                <Database className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-black">MongoDB Atlas</p>
                  <p className="text-xs text-neutral-500">
                    {dbOk === null ? "Đang kiểm tra…" : "Đã kết nối"}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">Hàng đợi offline</span>
            <span className="font-medium tabular-nums text-black">
              {queueCount} thao tác
            </span>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleSync}
            loading={syncing}
            disabled={dbOk === false}
          >
            <RefreshCw className="h-4 w-4" />
            Đồng bộ lại
          </Button>
        </CardContent>
      </Card>

      <Button
        variant="danger"
        size="lg"
        className="w-full"
        onClick={handleLogout}
      >
        <LogOut className="h-5 w-5" />
        Đăng xuất
      </Button>
    </div>
  );
}
