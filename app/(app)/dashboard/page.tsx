"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { isViewer, roleLabel, workingStaff } from "@/lib/roles";
import { listAttendance, listEmployees } from "@/lib/sheets";
import type { AttendanceRecord } from "@/lib/types";
import { formatShortDate, statusLabel, todayISO } from "@/lib/utils";
import { Clock, Eye, History, LogIn, LogOut, Timer, Utensils } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { user } = useAuth();
  const viewer = isViewer(user?.role);
  const [today, setToday] = useState<AttendanceRecord | null>(null);
  const [recent, setRecent] = useState<AttendanceRecord[]>([]);
  const [presentCount, setPresentCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const date = todayISO();
    if (viewer) {
      Promise.all([
        listEmployees(),
        listAttendance({ from: date, to: date }),
      ])
        .then(([emps, todayRecords]) => {
          const staff = workingStaff(emps);
          const names = new Set(staff.map((e) => e.name));
          const present = new Set(
            todayRecords
              .filter((r) => names.has(r.employeeName) && r.checkIn)
              .map((r) => r.employeeName)
          );
          setStaffCount(staff.length);
          setPresentCount(present.size);
          setRecent(todayRecords.slice(0, 8));
        })
        .finally(() => setLoading(false));
      return;
    }
    Promise.all([
      listAttendance({ name: user.name, from: date, to: date }),
      listAttendance({ name: user.name }),
    ])
      .then(([todayRecords, all]) => {
        setToday(todayRecords[0] ?? null);
        setRecent(all.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, [user, viewer]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (viewer) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-black">
            Xin chào, {user?.name?.split(" ").slice(-1)[0]}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-500">
            <Eye className="h-4 w-4" />
            Tài khoản {roleLabel(user?.role)} — chỉ xem, không được sửa dữ liệu
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <CardDescription>Có mặt hôm nay</CardDescription>
              <CardTitle className="text-2xl">
                {presentCount}/{staffCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Xem bảng công</CardDescription>
              <CardTitle>Công SIFLEX</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Link
                href="/history"
                className="inline-flex h-11 min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"
              >
                <History className="h-4 w-4" />
                Mở Công SIFLEX
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Xem đăng ký</CardDescription>
              <CardTitle>OT / Ăn ngoài</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2 pt-0">
              <Link
                href="/ot"
                className="inline-flex h-11 min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-black hover:bg-neutral-50"
              >
                <Timer className="h-4 w-4" />
                Lịch OT
              </Link>
              <Link
                href="/meals"
                className="inline-flex h-11 min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-black hover:bg-neutral-50"
              >
                <Utensils className="h-4 w-4" />
                Ăn ngoài
              </Link>
            </CardContent>
          </Card>
        </div>
        {recent.length > 0 && (
          <Card>
            <CardHeader>
              <CardDescription>Hôm nay</CardDescription>
              <CardTitle>Chấm công gần nhất</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {recent.map((r) => (
                  <li
                    key={`${r.date}-${r.employeeName}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="truncate text-neutral-600">
                      {r.employeeName}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-black">
                      {r.checkIn || "—"} → {r.checkOut || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const status = today
    ? today.status
    : ("absent" as const);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-black">
          Xin chào, {user?.name?.split(" ").slice(-1)[0]}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Tổng quan chấm công của bạn hôm nay
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardDescription>Trạng thái hôm nay</CardDescription>
            <CardTitle className="text-2xl">
              {statusLabel(status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-4 text-sm text-neutral-600">
              <span className="flex items-center gap-1.5">
                <LogIn className="h-4 w-4 text-neutral-400" />
                {today?.checkIn || "—"}
              </span>
              <span className="flex items-center gap-1.5">
                <LogOut className="h-4 w-4 text-neutral-400" />
                {today?.checkOut || "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Thao tác nhanh</CardDescription>
            <CardTitle>Chấm công</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Link
              href="/attendance"
              className="inline-flex h-14 min-h-[56px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-base font-medium text-white shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Clock className="h-5 w-5" />
              Vào trang chấm công
            </Link>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardDescription>Gần đây</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-neutral-400" />
              5 ngày gần nhất
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recent.length === 0 ? (
              <p className="text-sm text-neutral-500">Chưa có dữ liệu</p>
            ) : (
              <ul className="space-y-2">
                {recent.map((r) => (
                  <li
                    key={`${r.date}-${r.employeeName}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-neutral-600">
                      {formatShortDate(r.date)}
                    </span>
                    <span className="font-medium text-black">
                      {r.checkIn || "—"} → {r.checkOut || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
