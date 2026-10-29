"use client";

import { MealGrid } from "@/components/attendance/MealGrid";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { colorsForMonth, DEFAULT_COLUMN_COLORS } from "@/lib/column-colors";
import { exportMealGridXlsx } from "@/lib/export-xlsx";
import { canSeeAll, isAdmin as isAdminRole, isViewer, workingStaff } from "@/lib/roles";
import {
  getSettings,
  listEmployees,
  listMeals,
  saveMeal,
} from "@/lib/sheets";
import type { ColumnColors, Employee, MealRecord } from "@/lib/types";
import { monthRange, todayISO } from "@/lib/utils";
import { WORKPLACES, matchesCompany } from "@/lib/workplace";
import { ChevronLeft, ChevronRight, Download, Inbox } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function MealsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = isAdminRole(user?.role);
  const seeAll = canSeeAll(user?.role);
  const viewer = isViewer(user?.role);
  const today = todayISO();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [columnColors, setColumnColors] = useState<ColumnColors>(
    DEFAULT_COLUMN_COLORS
  );
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState("");

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
      const [emps, meals, settings] = await Promise.all([
        listEmployees(),
        listMeals(
          {
            from,
            to,
            name: seeAll ? undefined : user.name,
          },
          { force: true }
        ),
        getSettings(),
      ]);
      const list = seeAll
        ? workingStaff(emps)
        : emps.filter((e) => e.name === user.name);
      setEmployees(list);
      setRecords(meals);
      setColumnColors(colorsForMonth(settings, year, month));
    } finally {
      setLoading(false);
    }
  }, [user, from, to, seeAll, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleEmployees = useMemo(
    () => employees.filter((e) => matchesCompany(e, company)),
    [employees, company]
  );
  const visibleNames = useMemo(
    () => new Set(visibleEmployees.map((e) => e.name)),
    [visibleEmployees]
  );
  const visibleRecords = useMemo(
    () =>
      company
        ? records.filter((r) => visibleNames.has(r.employeeName))
        : records,
    [records, company, visibleNames]
  );

  const handleToggle = async (
    employeeName: string,
    date: string,
    next: { lunch: boolean; dinner: boolean }
  ) => {
    if (viewer) {
      toast("Tài khoản chỉ xem — không được sửa", "error");
      throw new Error("viewer");
    }
    const res = await saveMeal({
      name: employeeName,
      date,
      lunch: next.lunch,
      dinner: next.dinner,
    });
    if (!res.ok) {
      toast(res.error || "Không lưu được đăng ký ăn", "error");
      throw new Error(res.error || "save");
    }
    setRecords((prev) => {
      const rest = prev.filter(
        (r) => !(r.employeeName === employeeName && r.date === date)
      );
      if (next.lunch || next.dinner) {
        rest.push({
          employeeName,
          date,
          lunch: next.lunch,
          dinner: next.dinner,
          updatedAt: new Date().toISOString(),
        });
      }
      return rest;
    });
  };

  const exportXlsx = () => {
    void exportMealGridXlsx({
      year,
      month,
      employees: visibleEmployees,
      records: visibleRecords,
      columnColors,
      filename: `an_ngoai_${year}-${String(month).padStart(2, "0")}.xlsx`,
    }).catch(() => toast("Không xuất được file Excel", "error"));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => shiftMonth(-1)}
              aria-label="Tháng trước"
            >
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
              {Array.from(
                { length: 6 },
                (_, i) => Number(today.slice(0, 4)) - 2 + i
              ).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => shiftMonth(1)}
              aria-label="Tháng sau"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {seeAll && (
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
          description="Thêm nhân viên để đăng ký ăn ngoài theo tháng."
        />
      ) : (
        <MealGrid
          year={year}
          month={month}
          employees={visibleEmployees}
          records={visibleRecords}
          columnColors={columnColors}
          canEditName={(name) =>
            !viewer && (isAdmin || name === user?.name)
          }
          onToggle={handleToggle}
        />
      )}
    </div>
  );
}
