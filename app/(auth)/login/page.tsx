"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { listEmployees, verifyPin } from "@/lib/sheets";
import type { Employee } from "@/lib/types";
import { isValidPin } from "@/lib/utils";
import { Fingerprint } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { user, loading: authLoading, login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard");
  }, [authLoading, user, router]);

  useEffect(() => {
    listEmployees({ force: true })
      .then((list) => {
        setEmployees(list.filter((e) => e.active));
        if (list.filter((e) => e.active).length === 0) {
          setError("Chưa có nhân viên hoạt động trong database.");
        }
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Không kết nối được database. Thử lại sau."
        );
      })
      .finally(() => setLoadingList(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name) {
      setError("Vui lòng chọn tên của bạn");
      return;
    }
    if (!isValidPin(pin)) {
      setError("Mã PIN phải gồm 4–6 chữ số");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyPin(name, pin);
      if (!res.ok || !res.data) {
        setError(res.error || "Đăng nhập thất bại");
        return;
      }
      login(res.data);
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
          Đăng nhập để chấm công hôm nay
        </p>
      </div>

      <Card className="relative z-10 w-full max-w-md">
        <CardHeader>
          <CardTitle>Đăng nhập</CardTitle>
          <CardDescription>Chọn tên và nhập mã PIN (4–6 số)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="employee-name"
                className="text-sm font-medium text-neutral-800"
              >
                Họ và tên
              </label>
              <select
                id="employee-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loadingList}
                className="h-11 min-h-[44px] w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-black focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              >
                <option value="">
                  {loadingList ? "Đang tải..." : "— Chọn tên —"}
                </option>
                {employees.map((emp) => (
                  <option key={emp.name} value={emp.name}>
                    {emp.employeeCode ? `${emp.employeeCode} — ` : ""}
                    {emp.name}
                    {emp.role === "admin" ? " (Admin)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Mã PIN"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={6}
              placeholder="••••••"
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
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
