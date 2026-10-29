"use client";

import {
  contrastText,
  dayFill,
  DEFAULT_COLUMN_COLORS,
  WEEKDAY_SHORT,
} from "@/lib/column-colors";
import { mealCount, type MealKind } from "@/lib/meal";
import { freezeCol } from "@/lib/freeze-cols";
import { todayCol, todayDayOf } from "@/lib/today-column";
import type { ColumnColors, Employee, MealRecord } from "@/lib/types";
import { cn, daysInMonth, weekdayOf } from "@/lib/utils";
import { employeeCompany } from "@/lib/workplace";
import { useState } from "react";

export function MealGrid({
  year,
  month,
  employees,
  records,
  columnColors = DEFAULT_COLUMN_COLORS,
  canEditName,
  onToggle,
}: {
  year: number;
  month: number;
  employees: Employee[];
  records: MealRecord[];
  columnColors?: ColumnColors;
  canEditName?: (name: string) => boolean;
  onToggle: (
    employeeName: string,
    date: string,
    next: { lunch: boolean; dinner: boolean }
  ) => Promise<void> | void;
}) {
  const lastDay = daysInMonth(year, month);
  const days = Array.from({ length: lastDay }, (_, i) => i + 1);
  const mm = String(month).padStart(2, "0");
  const todayDay = todayDayOf(year, month);
  const { edge: todayEdge, top: todayTop, bottom: todayBottom } = todayCol;

  const byEmpDate = new Map<string, MealRecord>();
  for (const r of records) {
    byEmpDate.set(`${r.employeeName}|${r.date}`, r);
  }

  const rows = employees.map((emp, index) => {
    const cells = days.map((day) => {
      const date = `${year}-${mm}-${String(day).padStart(2, "0")}`;
      const rec = byEmpDate.get(`${emp.name}|${date}`);
      return {
        date,
        lunch: Boolean(rec?.lunch),
        dinner: Boolean(rec?.dinner),
      };
    });
    const total = cells.reduce(
      (sum, c) => sum + mealCount(c.lunch, c.dinner),
      0
    );
    return { emp, index, cells, total };
  });

  const sameTeam =
    employees.length > 0 &&
    employees.every((e) => (e.team || "") === (employees[0].team || ""));
  const sameShift =
    employees.length > 0 &&
    employees.every((e) => (e.shift || "") === (employees[0].shift || ""));

  const th =
    "border border-neutral-800 px-1 py-1 text-center text-[11px] font-bold leading-tight sm:text-xs";
  const td =
    "border border-neutral-800 px-1 py-1 text-center text-[11px] leading-tight sm:text-xs";

  const totalStyle = {
    backgroundColor: columnColors.total,
    color: contrastText(columnColors.total),
  };

  const [savingKey, setSavingKey] = useState<string | null>(null);

  const toggle = async (
    name: string,
    date: string,
    current: { lunch: boolean; dinner: boolean },
    kind: MealKind
  ) => {
    const key = `${name}|${date}|${kind}`;
    setSavingKey(key);
    try {
      await onToggle(name, date, {
        lunch: kind === "lunch" ? !current.lunch : current.lunch,
        dinner: kind === "dinner" ? !current.dinner : current.dinner,
      });
    } catch {
      /* giữ trạng thái cũ khi lưu lỗi */
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
        <table className={cn("w-max min-w-full text-black", freezeCol.table)}>
          <thead>
            <tr>
              <th
                className={cn(th, freezeCol.block, "text-left")}
                colSpan={4}
              >
                {`Ăn ngoài — Tháng ${month}/${year}`}
              </th>
              {days.map((day) => {
                const bg = dayFill(columnColors, year, month, day);
                const isToday = day === todayDay;
                return (
                  <th
                    key={`d-${day}`}
                    className={cn(th, "w-11 min-w-[44px]", isToday && todayTop)}
                    style={{ backgroundColor: bg, color: contrastText(bg) }}
                    title={isToday ? "Hôm nay" : undefined}
                  >
                    {day}
                    {isToday && (
                      <span className="mt-0.5 block text-[9px] font-extrabold leading-none text-primary">
                        NOW
                      </span>
                    )}
                  </th>
                );
              })}
              <th className={cn(th, "w-16 min-w-[56px]")} style={totalStyle}>
                Tổng
              </th>
            </tr>
            <tr>
              <th className={cn(th, freezeCol.no)}>No</th>
              <th className={cn(th, freezeCol.team)}>Team</th>
              <th className={cn(th, freezeCol.ca)}>Ca</th>
              <th className={cn(th, freezeCol.name, "text-left")}>
                Họ và Tên
                <br />
                <span className="font-normal text-neutral-500">Full Name</span>
              </th>
              {days.map((day) => {
                const bg = dayFill(columnColors, year, month, day);
                const isToday = day === todayDay;
                return (
                  <th
                    key={`w-${day}`}
                    className={cn(th, "w-11 min-w-[44px]", isToday && todayEdge)}
                    style={{ backgroundColor: bg, color: contrastText(bg) }}
                    title={isToday ? "Hôm nay" : undefined}
                  >
                    {WEEKDAY_SHORT[weekdayOf(year, month, day)]}
                  </th>
                );
              })}
              <th className={cn(th, "w-16 min-w-[56px]")} style={totalStyle}>
                Bữa
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ emp, index, cells, total }) => (
              <tr key={emp.name}>
                <td className={cn(td, freezeCol.no, "relative font-medium")}>
                  <span className="absolute left-0 top-0 border-t-[7px] border-r-[7px] border-t-green-600 border-r-transparent" />
                  {index + 1}
                </td>
                {(!sameTeam || index === 0) && (
                  <td
                    className={cn(td, freezeCol.team)}
                    rowSpan={sameTeam ? rows.length : undefined}
                  >
                    {emp.team || "—"}
                  </td>
                )}
                {(!sameShift || index === 0) && (
                  <td
                    className={cn(td, freezeCol.ca)}
                    rowSpan={sameShift ? rows.length : undefined}
                  >
                    {emp.shift || "—"}
                  </td>
                )}
                <td className={cn(td, freezeCol.name, "text-left font-medium")}>
                  {emp.name}
                  {employeeCompany(emp) ? (
                    <span className="mt-0.5 block text-[10px] font-normal text-neutral-500">
                      {employeeCompany(emp)}
                    </span>
                  ) : null}
                </td>
                {cells.map((cell, i) => {
                  const day = i + 1;
                  const bg = dayFill(columnColors, year, month, day);
                  const allow = !canEditName || canEditName(emp.name);
                  const isToday = day === todayDay;
                  return (
                    <td
                      key={`${emp.name}-${day}`}
                      className={cn(td, "p-0.5", isToday && todayEdge)}
                      style={{
                        backgroundColor: bg,
                        color: contrastText(bg),
                      }}
                      title={isToday ? "Hôm nay" : undefined}
                    >
                      <div className="flex flex-col gap-0.5">
                        <MealChip
                          label="T"
                          title={`Ăn trưa ngày ${day}`}
                          pressed={cell.lunch}
                          disabled={!allow || savingKey === `${emp.name}|${cell.date}|lunch`}
                          onClick={() =>
                            void toggle(emp.name, cell.date, cell, "lunch")
                          }
                        />
                        <MealChip
                          label="C"
                          title={`Ăn chiều ngày ${day}`}
                          pressed={cell.dinner}
                          disabled={!allow || savingKey === `${emp.name}|${cell.date}|dinner`}
                          onClick={() =>
                            void toggle(emp.name, cell.date, cell, "dinner")
                          }
                        />
                      </div>
                    </td>
                  );
                })}
                <td
                  className={cn(td, "font-bold tabular-nums")}
                  style={totalStyle}
                >
                  {total || ""}
                </td>
              </tr>
            ))}
            <tr>
              <td className={cn(td, freezeCol.block, "font-bold")} colSpan={4}>
                Tổng ăn trưa
              </td>
              {days.map((day) => {
                const count = rows.filter((r) => r.cells[day - 1].lunch).length;
                const bg = dayFill(columnColors, year, month, day);
                const isToday = day === todayDay;
                return (
                  <td
                    key={`lunch-${day}`}
                    className={cn(
                      td,
                      "font-bold tabular-nums",
                      isToday && todayEdge
                    )}
                    style={{ backgroundColor: bg, color: contrastText(bg) }}
                    title={isToday ? "Hôm nay" : undefined}
                  >
                    {count || ""}
                  </td>
                );
              })}
              <td className={cn(td, "font-bold tabular-nums")} style={totalStyle}>
                {rows.reduce(
                  (sum, r) => sum + r.cells.filter((c) => c.lunch).length,
                  0
                )}
              </td>
            </tr>
            <tr>
              <td className={cn(td, freezeCol.block, "font-bold")} colSpan={4}>
                Tổng ăn chiều
              </td>
              {days.map((day) => {
                const count = rows.filter((r) => r.cells[day - 1].dinner).length;
                const bg = dayFill(columnColors, year, month, day);
                const isToday = day === todayDay;
                return (
                  <td
                    key={`dinner-${day}`}
                    className={cn(
                      td,
                      "font-bold tabular-nums",
                      isToday && todayBottom
                    )}
                    style={{ backgroundColor: bg, color: contrastText(bg) }}
                    title={isToday ? "Hôm nay" : undefined}
                  >
                    {count || ""}
                  </td>
                );
              })}
              <td className={cn(td, "font-bold tabular-nums")} style={totalStyle}>
                {rows.reduce(
                  (sum, r) => sum + r.cells.filter((c) => c.dinner).length,
                  0
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="w-full max-w-xs rounded border border-red-500 bg-[#dceaf7] px-3 py-2 text-sm">
        <p className="mb-1 font-bold underline">Note</p>
        <p>
          <span className="font-bold text-red-600">T</span> {"-->"} Ăn trưa
        </p>
        <p>
          <span className="font-bold text-red-600">C</span> {"-->"} Ăn chiều
        </p>
        <p className="mt-1 text-neutral-600">
          Mỗi ngày chỉ 2 bữa. Bấm T hoặc C để đăng ký / hủy.
        </p>
      </div>
    </div>
  );
}

function MealChip({
  label,
  title,
  pressed,
  disabled,
  onClick,
}: {
  label: string;
  title: string;
  pressed: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-5 w-full rounded text-[10px] font-bold leading-none",
        pressed
          ? "bg-black text-white"
          : "bg-white/70 text-neutral-400 hover:bg-white",
        disabled && "cursor-not-allowed opacity-50",
        !disabled && "cursor-pointer"
      )}
    >
      {label}
    </button>
  );
}
