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
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { checkIn, checkOut, listAttendance } from "@/lib/sheets";
import type { AttendanceRecord } from "@/lib/types";
import {
  addDaysISO,
  formatDateVi,
  formatShortDate,
  statusLabel,
  todayISO,
} from "@/lib/utils";
import { CalendarDays, LogIn, LogOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [today, setToday] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"in" | "out" | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const date = todayISO();
    const fromStr = addDaysISO(date, -6);

    const [todayRecords, week] = await Promise.all([
      listAttendance({ name: user.name, from: date, to: date }),
      listAttendance({ name: user.name, from: fromStr, to: date }),
    ]);
    setToday(todayRecords[0] ?? null);
    setHistory(week);
  }, [user]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleCheckIn = async () => {
    if (!user) return;
    setBusy("in");
    try {
      const res = await checkIn(user.name);
      if (res.ok) {
        toast("Check-in thành công!", "success");
        await load();
      } else {
        toast(res.error || "Check-in thất bại", "error");
      }
    } finally {
      setBusy(null);
    }
  };

  const handleCheckOut = async () => {
    if (!user) return;
    setBusy("out");
    try {
      const res = await checkOut(user.name);
      if (res.ok) {
        toast("Check-out thành công!", "success");
        await load();
      } else {
        toast(res.error || "Check-out thất bại", "error");
      }
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const canCheckIn = !today?.checkIn;
  const canCheckOut = Boolean(today?.checkIn && !today?.checkOut);
  const status = today ? today.status : "absent";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-primary px-5 py-4 text-white">
          <p className="text-sm text-red-100">Hôm nay</p>
          <p className="text-lg font-semibold capitalize">
            {formatDateVi(todayISO())}
          </p>
        </div>
        <CardContent className="space-y-5 pt-5">
          <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-3">
            <span className="text-sm text-neutral-500">Trạng thái</span>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                status === "checked_out"
                  ? "bg-green-100 text-green-700"
                  : status === "checked_in"
                    ? "bg-primary-light text-primary"
                    : "bg-neutral-200 text-neutral-600"
              }`}
            >
              {statusLabel(status)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-neutral-100 p-4 text-center">
              <LogIn className="mx-auto mb-2 h-5 w-5 text-neutral-400" />
              <p className="text-xs text-neutral-500">Giờ vào</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-black">
                {today?.checkIn || "—:—"}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-100 p-4 text-center">
              <LogOut className="mx-auto mb-2 h-5 w-5 text-neutral-400" />
              <p className="text-xs text-neutral-500">Giờ ra</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-black">
                {today?.checkOut || "—:—"}
              </p>
            </div>
          </div>

          <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-10 grid grid-cols-1 gap-3 sm:static sm:grid-cols-2 lg:bottom-0">
            <Button
              size="lg"
              onClick={handleCheckIn}
              disabled={!canCheckIn}
              loading={busy === "in"}
              className="w-full text-base"
              aria-label="Check in"
            >
              <LogIn className="h-5 w-5" />
              Check in
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={handleCheckOut}
              disabled={!canCheckOut}
              loading={busy === "out"}
              className="w-full text-base"
              aria-label="Check out"
            >
              <LogOut className="h-5 w-5" />
              Check out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-neutral-400" />
            7 ngày gần nhất
          </CardTitle>
          <CardDescription>Lịch sử chấm công của bạn</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Chưa có lịch sử"
              description="Khi bạn chấm công, dữ liệu sẽ hiện ở đây."
              className="border-0 py-8 shadow-none"
            />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {history.map((r) => (
                <li
                  key={`${r.date}-${r.checkIn}`}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-black">
                      {formatShortDate(r.date)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {statusLabel(r.status)}
                    </p>
                  </div>
                  <p className="text-sm tabular-nums text-neutral-700">
                    {r.checkIn || "—"} → {r.checkOut || "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
