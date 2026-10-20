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
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { clearPendingPin, getPendingPin } from "@/lib/auth";
import { changePassword } from "@/lib/sheets";
import { isValidPin } from "@/lib/utils";
import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ChangePasswordPage() {
  const { user, loading: authLoading, updateUser, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needCurrent, setNeedCurrent] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.mustChangePassword) {
      router.replace("/dashboard");
      return;
    }
    const pending = getPendingPin();
    if (pending) setCurrentPin(pending);
    else setNeedCurrent(true);
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!user?.employeeCode) {
      setError("Thiếu mã nhân viên. Đăng nhập lại.");
      return;
    }
    if (!isValidPin(currentPin)) {
      setError("Nhập mật khẩu hiện tại");
      return;
    }
    if (!isValidPin(newPin)) {
      setError("Mật khẩu mới phải gồm 4–8 chữ số");
      return;
    }
    if (newPin === currentPin) {
      setError("Mật khẩu mới phải khác mật khẩu cũ");
      return;
    }
    if (newPin !== confirmPin) {
      setError("Xác nhận mật khẩu không khớp");
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(user.employeeCode, currentPin, newPin);
      if (!res.ok || !res.data) {
        setError(res.error || "Đổi mật khẩu thất bại");
        return;
      }
      clearPendingPin();
      updateUser({ ...res.data, mustChangePassword: false });
      toast("Đã đổi mật khẩu. Tiếp tục sử dụng.", "success");
      router.replace("/dashboard");
    } catch {
      setError("Không thể kết nối. Thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-red-200">
          <KeyRound className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-black">Đổi mật khẩu</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Lần đầu đăng nhập — đặt mật khẩu mới cho {user.employeeCode}
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Mật khẩu mới</CardTitle>
          <CardDescription>4–8 chữ số, khác mật khẩu được cấp</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {needCurrent && (
              <Input
                label="Mật khẩu hiện tại"
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={currentPin}
                onChange={(e) =>
                  setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 8))
                }
              />
            )}
            <Input
              label="Mật khẩu mới"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={8}
              placeholder="••••••••"
              value={newPin}
              onChange={(e) =>
                setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))
              }
            />
            <Input
              label="Nhập lại mật khẩu mới"
              type="password"
              inputMode="numeric"
              maxLength={8}
              placeholder="••••••••"
              value={confirmPin}
              onChange={(e) =>
                setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))
              }
              error={error || undefined}
            />
            <Button type="submit" size="lg" loading={loading} className="w-full">
              Lưu mật khẩu
            </Button>
            <Button type="button" variant="ghost" onClick={logout}>
              Đăng xuất
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
