"use client";

import {
  EmployeePicker,
  resolveLoginCode,
} from "@/components/auth/EmployeePicker";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { setPendingPin } from "@/lib/auth";
import { listLoginRoster, verifyPin } from "@/lib/sheets";
import type { LoginRosterItem } from "@/lib/types";
import { isValidPin } from "@/lib/utils";
import { Fingerprint } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { user, loading: authLoading, login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [employeeCode, setEmployeeCode] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roster, setRoster] = useState<LoginRosterItem[]>([]);

  useEffect(() => {
    if (authLoading || !user) return;
    router.replace(user.mustChangePassword ? "/change-password" : "/dashboard");
  }, [authLoading, user, router]);

  useEffect(() => {
    let cancelled = false;
    listLoginRoster()
      .then((list) => {
        if (!cancelled) setRoster(list);
      })
      .catch(() => {
        if (!cancelled) setRoster([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const code = resolveLoginCode(employeeCode, roster);
    if (!code) {
      setError("Vui lòng nhập hoặc chọn mã nhân viên");
      return;
    }
    if (!isValidPin(pin)) {
      setError("Mật khẩu phải gồm 4–8 chữ số");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyPin(code, pin);
      if (!res.ok || !res.data) {
        setError(res.error || "Đăng nhập thất bại");
        return;
      }
      login(res.data);
      if (res.data.mustChangePassword) {
        setPendingPin(pin);
        toast("Lần đầu đăng nhập — vui lòng đổi mật khẩu", "info");
        router.replace("/change-password");
        return;
      }
      toast(`Xin chào, ${res.data.name}!`, "success");
      router.replace("/dashboard");
    } catch {
      setError("Không thể kết nối. Thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #000 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-red-200">
          <Fingerprint className="h-8 w-8" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-black">
          ChấmCông
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Gõ mã NV, gõ tên, hoặc chọn trong danh sách
        </p>
      </div>

      <Card className="relative z-10 w-full max-w-md">
        <CardHeader>
          <CardTitle>Đăng nhập</CardTitle>
          <CardDescription>
            Không nhớ mã thì chọn tên trong danh sách
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <EmployeePicker
              value={employeeCode}
              onChange={setEmployeeCode}
              options={roster}
              disabled={loading}
            />
            <Input
              label="Mật khẩu"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={8}
              placeholder="••••••••"
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 8))
              }
              error={error || undefined}
            />

            <Button
              type="submit"
              size="lg"
              loading={loading}
              className="mt-2 w-full"
            >
              Đăng nhập
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
