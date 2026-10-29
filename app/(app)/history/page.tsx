"use client";

import { MonthGrid } from "@/components/attendance/MonthGrid";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { colorsForMonth, DEFAULT_COLUMN_COLORS } from "@/lib/column-colors";
import { exportMonthGridXlsx } from "@/lib/export-xlsx";
import { canSeeAll, workingStaff } from "@/lib/roles";
import { getSettings, listAttendance, listEmployees } from "@/lib/sheets";
import type { AttendanceRecord, ColumnColors, Employee } from "@/lib/types";
import { monthRange, todayISO } from "@/lib/utils";
import {
  WORKPLACES,
  matchesCompany,
  parseWorkplace,
} from "@/lib/workplace";
import { ChevronLeft, ChevronRight, Download, Inbox } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function HistoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const seeAll = canSeeAll(user?.role);
  const today = todayISO();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [columnColors, setColumnColors] = useState<ColumnColors>(
    DEFAULT_COLUMN_COLORS
  );
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState("");
  const [site, setSite] = useState("");

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
          name: seeAll ? undefined : user.name,
        }),
        getSettings(),
      ]);
      const list = seeAll
        ? workingStaff(emps)
        : emps.filter((e) => e.name === user.name);
      setEmployees(list);
      setRecords(att);
      setColumnColors(colorsForMonth(settings, year, month));
    } finally {
      setLoading(false);
    }
  }, [user, from, to, seeAll, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleEmployees = useMemo(() => {
    const byCompany = employees.filter((e) => matchesCompany(e, company));
    if (!site) return byCompany;
    const names = new Set(
      records
        .filter((r) => parseWorkplace(r.workplace) === site)
        .map((r) => r.employeeName)
    );
    return byCompany.filter((e) => names.has(e.name));
  }, [employees, records, company, site]);
  const visibleNames = useMemo(
    () => new Set(visibleEmployees.map((e) => e.name)),
    [visibleEmployees]
  );
  const visibleRecords = useMemo(
    () =>
      records.filter((r) => {
        if (!visibleNames.has(r.employeeName)) return false;
        if (site && parseWorkplace(r.workplace) !== site) return false;
        return true;
      }),
    [records, visibleNames, site]
  );

  const exportXlsx = () => {
    void exportMonthGridXlsx({
      year,
      month,
      employees: visibleEmployees,
      records: visibleRecords,
      columnColors,
      title: `Công SIFLEX — Tháng ${month}/${year}`,
      hoursLabel: "Giờ",
      footerLabel: "Tổng người có mặt",
      notes: [
        "Note",
        "P --> Nghỉ phép",
        "/ --> Nghỉ",
        "Số = số giờ làm (vào → ra)",
        "SF = SIFLEX, SX = SYNOPEX (nơi làm trong ngày)",
      ],
      filename: `chamcong_${year}-${String(month).padStart(2, "0")}.xlsx`,
      sheetName: "Cong",
    }).catch(() => toast("Không xuất được file Excel", "error"));
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
            {seeAll && (
              <>
                <select
                  aria-label="Đơn vị"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-11 min-h-[44px] rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Tất cả đơn vị</option>
                  {WORKPLACES.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Nơi làm việc"
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  className="h-11 min-h-[44px] rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Tất cả nơi làm</option>
                  {WORKPLACES.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
          {seeAll && (
            <Button
              variant="outline"
              onClick={exportXlsx}
              disabled={visibleEmployees.length === 0}
              className="sm:ml-auto"
            >
              <Download className="h-4 w-4" />
              Xuất Excel
            </Button>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <TableSkeleton />
      ) : visibleEmployees.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Không có nhân viên"
          description="Thêm nhân viên rồi chấm công để hiện bảng tháng."
        />
      ) : (
        <MonthGrid
          year={year}
          month={month}
          employees={visibleEmployees}
          records={visibleRecords}
          columnColors={columnColors}
          title={`Công SIFLEX — Tháng ${month}/${year}`}
        />
      )}
    </div>
  );
}
