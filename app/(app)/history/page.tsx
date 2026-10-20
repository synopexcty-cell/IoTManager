"use client";

import { MonthGrid } from "@/components/attendance/MonthGrid";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { DEFAULT_COLUMN_COLORS } from "@/lib/column-colors";
import { getSettings, listAttendance, listEmployees } from "@/lib/sheets";
import type { AttendanceRecord, ColumnColors, Employee } from "@/lib/types";
import { monthRange, todayISO } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Download, Inbox } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function HistoryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const today = todayISO();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [columnColors, setColumnColors] = useState<ColumnColors>(
    DEFAULT_COLUMN_COLORS
  );
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
      const [emps, att, settings] = await Promise.all([
        listEmployees(),
        listAttendance({
          from,
          to,
          name: isAdmin ? undefined : user.name,
        }),
        getSettings(),
      ]);
      const list = isAdmin
        ? emps.filter((e) => e.active)
        : emps.filter((e) => e.name === user.name);
      setEmployees(list);
      setRecords(att);
      setColumnColors(settings.columnColors);
    } finally {
      setLoading(false);
    }
  }, [user, from, to, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = () => {
    const header = [
      "Timestamp",
      "EmployeeName",
      "Date",
      "CheckIn",
      "CheckOut",
      "Status",
      "Note",
    ];
    const rows = records.map((r) =>
      [r.timestamp, r.employeeName, r.date, r.checkIn, r.checkOut, r.status, r.note]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chamcong_${year}-${String(month).padStart(2, "0")}.csv`;
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

      {loading ? (
        <TableSkeleton />
      ) : employees.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Không có nhân viên"
          description="Thêm nhân viên rồi chấm công để hiện bảng tháng."
        />
      ) : (
        <MonthGrid
          year={year}
          month={month}
          employees={employees}
          records={records}
          columnColors={columnColors}
        />
      )}
    </div>
  );
}
