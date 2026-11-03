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
import { parseOtValue } from "@/lib/ot";
import {
  employeeOtBlockedMessage,
  formatOtLocal,
  isOtWindowOpen,
  normalizeOtWindow,
} from "@/lib/ot-window";
import { canSeeAll, isAdmin as isAdminRole, isViewer, workingStaff } from "@/lib/roles";
import {
  getSettings,
  listAttendance,
  listEmployees,
  listOt,
  saveOt,
} from "@/lib/sheets";
import type {
  AttendanceRecord,
  ColumnColors,
  Employee,
  OtRecord,
  OtWindow,
} from "@/lib/types";
import { monthRange, todayISO } from "@/lib/utils";
import {
  WORKPLACES,
  employeeCompany,
  matchesCompany,
  parseWorkplace,
} from "@/lib/workplace";
import { ChevronLeft, ChevronRight, Download, Inbox } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

function otSiteOf(
  ot: OtRecord | undefined,
  attendance: AttendanceRecord[]
): string {
  const fromOt = parseWorkplace(ot?.workplace);
  if (fromOt) return fromOt;
  if (!ot) return "";
  return parseWorkplace(
    attendance.find(
      (a) => a.employeeName === ot.employeeName && a.date === ot.date
    )?.workplace
  );
}

export default function OtPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = isAdminRole(user?.role);
  const seeAll = canSeeAll(user?.role);
  const viewer = isViewer(user?.role);
  const today = todayISO();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<OtRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [columnColors, setColumnColors] = useState<ColumnColors>(
    DEFAULT_COLUMN_COLORS
  );
  const [otWindow, setOtWindow] = useState<OtWindow | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState("");
  const [site, setSite] = useState("");
  /** Nơi OT khi đăng ký / sửa ô — có thể khác nơi làm ban ngày */
  const [otWorkplace, setOtWorkplace] = useState("");

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
      const nameFilter = seeAll ? undefined : user.name;
      const [emps, ot, att, settings] = await Promise.all([
        listEmployees(),
        listOt({ from, to, name: nameFilter }, { force: true }),
        listAttendance({ from, to, name: nameFilter }),
        getSettings({ force: true }),
      ]);
      const list = seeAll
        ? workingStaff(emps)
        : emps.filter((e) => e.name === user.name);
      setEmployees(list);
      setRecords(ot);
      setAttendance(att);
      setColumnColors(colorsForMonth(settings, year, month));
      setOtWindow(normalizeOtWindow(settings.otWindow));
    } finally {
      setLoading(false);
    }
  }, [user, from, to, seeAll, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (otWorkplace || !user) return;
    const self = employees.find((e) => e.name === user.name);
    const fallback = employeeCompany(self || {});
    if (fallback) setOtWorkplace(fallback);
  }, [otWorkplace, employees, user]);

  const otOpen = isOtWindowOpen(otWindow, nowTick);
  const canEmployeeEdit = otOpen;

  const visibleEmployees = useMemo(() => {
    const byCompany = employees.filter((e) => matchesCompany(e, company));
    if (!site) return byCompany;
    const names = new Set(
      records
        .filter((r) => otSiteOf(r, attendance) === site)
        .map((r) => r.employeeName)
    );
    return byCompany.filter((e) => names.has(e.name));
  }, [employees, records, attendance, company, site]);
  const visibleNames = useMemo(
    () => new Set(visibleEmployees.map((e) => e.name)),
    [visibleEmployees]
  );
  const visibleRecords = useMemo(
    () =>
      records.filter((r) => {
        if (!visibleNames.has(r.employeeName)) return false;
        if (!site) return true;
        return otSiteOf(r, attendance) === site;
      }),
    [records, attendance, visibleNames, site]
  );
  const visibleAttendance = useMemo(
    () => attendance.filter((r) => visibleNames.has(r.employeeName)),
    [attendance, visibleNames]
  );

  const handleCommit = async (employeeName: string, date: string, raw: string) => {
    const parsed = parseOtValue(raw);
    if (parsed == null) {
      toast("Giờ OT không hợp lệ (0–24, P hoặc /)", "error");
      throw new Error("invalid");
    }
    if (viewer) {
      toast("Tài khoản chỉ xem — không được sửa", "error");
      throw new Error("viewer");
    }
    if (!isAdmin && !isOtWindowOpen(otWindow)) {
      toast(employeeOtBlockedMessage(otWindow), "error");
      throw new Error("closed");
    }
    const prev = records.find(
      (r) => r.employeeName === employeeName && r.date === date
    );
    const workplace =
      parseWorkplace(otWorkplace) ||
      parseWorkplace(prev?.workplace) ||
      parseWorkplace(
        attendance.find(
          (a) => a.employeeName === employeeName && a.date === date
        )?.workplace
      );
    if (parsed && !workplace) {
      toast(
        "Chọn nơi OT (SIFLEX hoặc SYNOPEX). Có thể OT ở chỗ khác nơi làm ban ngày.",
        "error"
      );
      throw new Error("workplace");
    }
    const res = await saveOt({
      name: employeeName,
      date,
      value: parsed,
      workplace: parsed ? workplace : undefined,
    });
    if (!res.ok) {
      toast(res.error || "Không lưu được OT", "error");
      throw new Error(res.error || "save");
    }
    setRecords((prevList) => {
      const next = prevList.filter(
        (r) => !(r.employeeName === employeeName && r.date === date)
      );
      if (parsed) {
        next.push({
          employeeName,
          date,
          value: parsed,
          workplace,
          updatedAt: new Date().toISOString(),
        });
      }
      return next;
    });
  };

  const exportXlsx = () => {
    void exportMonthGridXlsx({
      year,
      month,
      employees: visibleEmployees,
      entries: visibleRecords,
      records: visibleAttendance,
      columnColors,
      title: `Lịch OT — Tháng ${month}/${year}`,
      hoursLabel: "Giờ OT",
      footerLabel: "Tổng người OT",
      notes: [
        "Note",
        "P --> Nghỉ phép",
        "/ --> Nghỉ",
        "Số = số giờ OT",
        "SF = SIFLEX, SX = SYNOPEX (nơi OT — có thể khác nơi làm ban ngày)",
      ],
      filename: `ot_${year}-${String(month).padStart(2, "0")}.xlsx`,
      sheetName: "OT",
    }).catch(() => toast("Không xuất được file Excel", "error"));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
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
                  aria-label="Lọc nơi OT"
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  className="h-11 min-h-[44px] rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Tất cả nơi OT</option>
                  {WORKPLACES.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </>
            )}
            {!viewer && (
              <select
                aria-label="Nơi OT khi đăng ký"
                value={otWorkplace}
                onChange={(e) => setOtWorkplace(e.target.value)}
                className="h-11 min-h-[44px] rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— Nơi OT khi đăng ký —</option>
                {WORKPLACES.map((w) => (
                  <option key={w} value={w}>
                    OT tại {w}
                  </option>
                ))}
              </select>
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

      <div
        className={`rounded-lg px-4 py-3 text-sm ${
          viewer
            ? "bg-neutral-50 text-neutral-700"
            : isAdmin
              ? "bg-neutral-50 text-neutral-700"
              : otOpen
                ? "bg-emerald-50 text-emerald-800"
                : "bg-amber-50 text-amber-800"
        }`}
      >
        {viewer
          ? "Tài khoản chỉ xem — không đăng ký hoặc sửa OT."
          : isAdmin
            ? otOpen && otWindow
              ? `Nhân viên đang được đăng ký OT đến ${formatOtLocal(otWindow.to)}. Quản trị luôn sửa được.`
              : `${employeeOtBlockedMessage(otWindow, nowTick)} Quản trị vẫn sửa được.`
            : otOpen && otWindow
              ? `Đang mở đăng ký OT đến ${formatOtLocal(otWindow.to)}.`
              : employeeOtBlockedMessage(otWindow, nowTick)}
        {!viewer && (
          <span className="mt-1 block text-neutral-600">
            Nơi OT chọn riêng (ví dụ làm ngày tại SIFLEX, về SYNOPEX OT) — không
            phụ thuộc nơi chấm công ban ngày.
          </span>
        )}
      </div>

      {loading ? (
        <TableSkeleton />
      ) : visibleEmployees.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Không có nhân viên"
          description="Thêm nhân viên để đăng ký OT theo tháng."
        />
      ) : (
        <MonthGrid
          year={year}
          month={month}
          employees={visibleEmployees}
          entries={visibleRecords}
          records={visibleAttendance}
          columnColors={columnColors}
          title={`Lịch OT — Tháng ${month}/${year}`}
          hoursLabel="Giờ OT"
          footerLabel="Tổng người OT"
          noteHours={
            viewer
              ? "Tài khoản chỉ xem."
              : isAdmin || canEmployeeEdit
                ? "Số = số giờ OT. Chọn «Nơi OT khi đăng ký» rồi bấm ô để lưu (P = phép, / = nghỉ, xóa ô = bỏ)."
                : "Chỉ xem — ngoài thời gian đăng ký OT."
          }
          editable={!viewer && (isAdmin || canEmployeeEdit)}
          canEditName={(name) =>
            !viewer && (isAdmin || (canEmployeeEdit && name === user?.name))
          }
          onCommit={handleCommit}
        />
      )}
    </div>
  );
}
