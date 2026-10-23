"use client";

import { MonthGrid } from "@/components/attendance/MonthGrid";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { colorsForMonth, DEFAULT_COLUMN_COLORS } from "@/lib/column-colors";
import { parseOtValue } from "@/lib/ot";
import {
  employeeOtBlockedMessage,
  formatOtLocal,
  isOtWindowOpen,
  normalizeOtWindow,
} from "@/lib/ot-window";
import { getSettings, listEmployees, listOt, saveOt } from "@/lib/sheets";
import type { ColumnColors, Employee, OtRecord, OtWindow } from "@/lib/types";
import { monthRange, todayISO } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Download, Inbox } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function OtPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const today = todayISO();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<OtRecord[]>([]);
  const [columnColors, setColumnColors] = useState<ColumnColors>(
    DEFAULT_COLUMN_COLORS
  );
  const [otWindow, setOtWindow] = useState<OtWindow | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);

  const { from, to } = useMemo(() => monthRange(year, month), [year, month]);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [emps, ot, settings] = await Promise.all([
        listEmployees(),
        listOt(
          {
            from,
            to,
            name: isAdmin ? undefined : user.name,
          },
          { force: true }
        ),
        getSettings({ force: true }),
      ]);
      const list = isAdmin
        ? emps.filter((e) => e.active)
        : emps.filter((e) => e.name === user.name);
      setEmployees(list);
      setRecords(ot);
      setColumnColors(colorsForMonth(settings, year, month));
      setOtWindow(normalizeOtWindow(settings.otWindow));
    } finally {
      setLoading(false);
    }
  }, [user, from, to, isAdmin, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const otOpen = isOtWindowOpen(otWindow, nowTick);
  const canEmployeeEdit = otOpen;

  const handleCommit = async (employeeName: string, date: string, raw: string) => {
    const parsed = parseOtValue(raw);
    if (parsed == null) {
      toast("Giờ OT không hợp lệ (0–24, P hoặc /)", "error");
      throw new Error("invalid");
    }
    if (!isAdmin && !isOtWindowOpen(otWindow)) {
      toast(employeeOtBlockedMessage(otWindow), "error");
      throw new Error("closed");
    }
    const res = await saveOt({ name: employeeName, date, value: parsed });
    if (!res.ok) {
      toast(res.error || "Không lưu được OT", "error");
      throw new Error(res.error || "save");
    }
    setRecords((prev) => {
      const next = prev.filter(
        (r) => !(r.employeeName === employeeName && r.date === date)
      );
      if (parsed) {
        next.push({
          employeeName,
          date,
          value: parsed,
          updatedAt: new Date().toISOString(),
        });
      }
      return next;
    });
  };

  const exportCsv = () => {
    const header = ["EmployeeName", "Date", "OT"];
    const rows = records.map((r) =>
      [r.employeeName, r.date, r.value]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ot_${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => shiftMonth(-1)} aria-label="Tháng trước">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <select
              aria-label="Tháng"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-11 min-h-[44px] rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
            <select
              aria-label="Năm"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-11 min-h-[44px] rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {Array.from({ length: 6 }, (_, i) => Number(today.slice(0, 4)) - 2 + i).map(
                (y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                )
              )}
            </select>
            <Button variant="outline" size="sm" onClick={() => shiftMonth(1)} aria-label="Tháng sau">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              onClick={exportCsv}
              disabled={records.length === 0}
              className="sm:ml-auto"
            >
              <Download className="h-4 w-4" />
              Xuất CSV
            </Button>
          )}
        </CardContent>
      </Card>

      <div
        className={`rounded-lg px-4 py-3 text-sm ${
          isAdmin
            ? "bg-neutral-50 text-neutral-700"
            : otOpen
              ? "bg-emerald-50 text-emerald-800"
              : "bg-amber-50 text-amber-800"
        }`}
      >
        {isAdmin
          ? otOpen && otWindow
            ? `Nhân viên đang được đăng ký OT đến ${formatOtLocal(otWindow.to)}. Quản trị luôn sửa được.`
            : `${employeeOtBlockedMessage(otWindow, nowTick)} Quản trị vẫn sửa được.`
          : otOpen && otWindow
            ? `Đang mở đăng ký OT đến ${formatOtLocal(otWindow.to)}.`
            : employeeOtBlockedMessage(otWindow, nowTick)}
      </div>

      {loading ? (
        <TableSkeleton />
      ) : employees.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Không có nhân viên"
          description="Thêm nhân viên để đăng ký OT theo tháng."
        />
      ) : (
        <MonthGrid
          year={year}
          month={month}
          employees={employees}
          entries={records}
          columnColors={columnColors}
          title={`Lịch OT — Tháng ${month}/${year}`}
          hoursLabel="Giờ OT"
          footerLabel="Tổng người OT"
          noteHours={
            isAdmin || canEmployeeEdit
              ? "Số = số giờ OT. Bấm vào ô để đăng ký (P = phép, / = nghỉ, xóa ô = bỏ)."
              : "Chỉ xem — ngoài thời gian đăng ký OT."
          }
          editable={isAdmin || canEmployeeEdit}
          canEditName={(name) =>
            isAdmin || (canEmployeeEdit && name === user?.name)
          }
          onCommit={handleCommit}
        />
      )}
    </div>
  );
}
