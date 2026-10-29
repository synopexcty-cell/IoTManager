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
import { Input } from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { isAdmin as isAdminRole, isViewer, workingStaff } from "@/lib/roles";
import {
  checkIn,
  checkOut,
  listAttendance,
  listEmployees,
  saveAttendance,
} from "@/lib/sheets";
import type { AttendanceRecord, Employee } from "@/lib/types";
import {
  addDaysISO,
  formatDateVi,
  formatShortDate,
  normalizeTime,
  nowTime,
  statusLabel,
  todayISO,
} from "@/lib/utils";
import {
  WORKPLACES,
  employeeCompany,
  parseWorkplace,
} from "@/lib/workplace";
import { CalendarDays, LogIn, LogOut, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function AttendancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const isAdmin = isAdminRole(user?.role);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [targetName, setTargetName] = useState("");
  const [date, setDate] = useState(() => todayISO());
  const [timeIn, setTimeIn] = useState("");
  const [timeOut, setTimeOut] = useState("");
  const [note, setNote] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [today, setToday] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"in" | "out" | "save" | null>(null);

  const subjectName = isAdmin ? targetName : user?.name || "";

  useEffect(() => {
    if (user && isViewer(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    listEmployees().then((list) => {
      const active = workingStaff(list);
      setEmployees(active);
      if (isAdmin) setTargetName((prev) => prev || user.name);
    });
  }, [isAdmin, user]);

  const load = useCallback(async () => {
    if (!subjectName) return;
    const fromStr = addDaysISO(date, -6);
    const [dayRecords, week] = await Promise.all([
      listAttendance({ name: subjectName, from: date, to: date }, { force: true }),
      listAttendance({ name: subjectName, from: fromStr, to: date }, { force: true }),
    ]);
    const rec = dayRecords[0] ?? null;
    setToday(rec);
    setHistory(week);
    setTimeIn(rec?.checkIn || "");
    setTimeOut(rec?.checkOut || "");
    setNote(rec?.note || "");
    setWorkplace(parseWorkplace(rec?.workplace) || "");
  }, [subjectName, date]);

  useEffect(() => {
    if (!subjectName) return;
    load().finally(() => setLoading(false));
  }, [load, subjectName]);

  useEffect(() => {
    if (workplace) return;
    const last = history.find((r) => parseWorkplace(r.workplace));
    if (last) {
      setWorkplace(parseWorkplace(last.workplace));
      return;
    }
    const emp = employees.find((e) => e.name === subjectName);
    const fallback = employeeCompany(emp || {});
    if (fallback) setWorkplace(fallback);
  }, [workplace, history, employees, subjectName]);

  const handleCheckIn = async () => {
    if (!user || !subjectName) return;
    const site = parseWorkplace(workplace);
    if (!site) {
      toast("Chọn nơi làm việc hôm nay (SIFLEX hoặc SYNOPEX)", "error");
      return;
    }
    setBusy("in");
    try {
      const res = isAdmin
        ? await saveAttendance({
            name: subjectName,
            date,
            checkIn: normalizeTime(timeIn) || nowTime(),
            checkOut: normalizeTime(timeOut) || today?.checkOut || "",
            note,
            workplace: site,
          })
        : await checkIn(user.name, site);
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
    if (!user || !subjectName) return;
    setBusy("out");
    try {
      const res = isAdmin
        ? await saveAttendance({
            name: subjectName,
            date,
            checkIn: normalizeTime(timeIn) || today?.checkIn || "",
            checkOut: normalizeTime(timeOut) || nowTime(),
            note,
            workplace: parseWorkplace(workplace) || today?.workplace,
          })
        : await checkOut(user.name);
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

  const handleSave = async () => {
    if (!subjectName) return;
    const inTime = normalizeTime(timeIn);
    if (!inTime) {
      toast("Nhập giờ vào (HH:mm)", "error");
      return;
    }
    const site = parseWorkplace(workplace);
    if (!site) {
      toast("Chọn nơi làm việc (SIFLEX hoặc SYNOPEX)", "error");
      return;
    }
    setBusy("save");
    try {
      const res = await saveAttendance({
        name: subjectName,
        date,
        checkIn: inTime,
        checkOut: normalizeTime(timeOut),
        note,
        workplace: site,
      });
      if (res.ok) {
        toast("Đã lưu chấm công", "success");
        await load();
      } else {
        toast(res.error || "Lưu thất bại", "error");
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

  const canCheckIn = isAdmin || !today?.checkIn;
  const canCheckOut = isAdmin
    ? Boolean(normalizeTime(timeIn) || today?.checkIn)
    : Boolean(today?.checkIn && !today?.checkOut);
  const status = today ? today.status : "absent";
  const headingDate = isAdmin ? date : todayISO();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-primary px-5 py-4 text-white">
          <p className="text-sm text-red-100">
            {isAdmin ? "Chấm công (quản trị có thể ghi hộ / bù ngày)" : "Hôm nay"}
          </p>
          <p className="text-lg font-semibold capitalize">
            {formatDateVi(headingDate)}
          </p>
        </div>
        <CardContent className="space-y-5 pt-5">
          {isAdmin && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label
                  htmlFor="att-emp"
                  className="text-sm font-medium text-neutral-800"
                >
                  Nhân viên
                </label>
                <select
                  id="att-emp"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  className="h-11 min-h-[44px] w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {employees.map((emp) => (
                    <option key={emp.name} value={emp.name}>
                      {emp.employeeCode ? `${emp.employeeCode} — ` : ""}
                      {emp.name}
                      {employeeCompany(emp) ? ` · ${employeeCompany(emp)}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Ngày"
                type="date"
                max={todayISO()}
                value={date}
                onChange={(e) => setDate(e.target.value || todayISO())}
              />
              <Input
                label="Ghi chú"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Không bắt buộc"
              />
              <Input
                label="Giờ vào"
                type="time"
                value={timeIn}
                onChange={(e) => setTimeIn(e.target.value)}
              />
              <Input
                label="Giờ ra"
                type="time"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="att-workplace"
              className="text-sm font-medium text-neutral-800"
            >
              Nơi làm việc hôm nay
            </label>
            <select
              id="att-workplace"
              value={workplace}
              onChange={(e) => setWorkplace(e.target.value)}
              className="h-11 min-h-[44px] w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">— Chọn SIFLEX hoặc SYNOPEX —</option>
              {WORKPLACES.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500">
              Người thuộc đơn vị khác vẫn chọn nơi đang làm trong ngày.
            </p>
          </div>

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

          <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-10 grid grid-cols-1 gap-3 sm:static lg:bottom-0">
            {isAdmin && (
              <Button
                size="lg"
                onClick={handleSave}
                loading={busy === "save"}
                className="w-full text-base"
              >
                <Save className="h-5 w-5" />
                Lưu chấm công
              </Button>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                size="lg"
                onClick={handleCheckIn}
                disabled={!canCheckIn || !subjectName}
                loading={busy === "in"}
                className="w-full text-base"
                aria-label="Check in"
                variant={isAdmin ? "outline" : "primary"}
              >
                <LogIn className="h-5 w-5" />
                Check in
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={handleCheckOut}
                disabled={!canCheckOut || !subjectName}
                loading={busy === "out"}
                className="w-full text-base"
                aria-label="Check out"
              >
                <LogOut className="h-5 w-5" />
                Check out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-neutral-400" />
            7 ngày gần nhất
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? `Lịch sử chấm công của ${subjectName || "nhân viên"}`
              : "Lịch sử chấm công của bạn"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Chưa có lịch sử"
              description="Khi chấm công, dữ liệu sẽ hiện ở đây."
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
                      {parseWorkplace(r.workplace)
                        ? ` · ${parseWorkplace(r.workplace)}`
                        : ""}
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
