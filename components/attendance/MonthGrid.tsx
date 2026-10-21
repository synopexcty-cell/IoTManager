"use client";

import {
  contrastText,
  dayFill,
  DEFAULT_COLUMN_COLORS,
  WEEKDAY_SHORT,
} from "@/lib/column-colors";
import { formatOtDisplay } from "@/lib/ot";
import type { AttendanceRecord, ColumnColors, Employee } from "@/lib/types";
import { cn, daysInMonth, todayISO, weekdayOf, workedHours } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

type CellValue = number | "P" | "/" | string | undefined;

function cellFromRecord(rec?: AttendanceRecord): CellValue {
  if (!rec) return undefined;
  const note = (rec.note || "").trim().toUpperCase();
  if (note === "P" || note.includes("PHÉP") || note.includes("PHEP")) return "P";
  if (note === "/") return "/";
  const hours = workedHours(rec.checkIn, rec.checkOut);
  if (hours != null) return hours;
  if (rec.checkIn) return rec.checkIn;
  return undefined;
}

function cellFromEntry(raw?: string): CellValue {
  if (!raw) return undefined;
  if (raw === "P" || raw === "/") return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : raw;
}

function isLeave(value: CellValue) {
  return value === "P" || value === "/";
}

function weekdayFill(colors: ColumnColors, year: number, month: number, day: number) {
  return dayFill(colors, year, month, day);
}

export function MonthGrid({
  year,
  month,
  employees,
  records,
  entries,
  columnColors = DEFAULT_COLUMN_COLORS,
  title,
  hoursLabel = "Giờ",
  footerLabel = "Tổng người có mặt",
  noteHours = "Số = số giờ làm (vào → ra)",
  showNote = true,
  editable = false,
  canEditName,
  onCommit,
  onPaintDay,
  onPaintTotal,
}: {
  year: number;
  month: number;
  employees: Employee[];
  records?: AttendanceRecord[];
  /** Đăng ký OT: employeeName|date → value */
  entries?: { employeeName: string; date: string; value: string }[];
  columnColors?: ColumnColors;
  title?: string;
  hoursLabel?: string;
  footerLabel?: string;
  noteHours?: string;
  showNote?: boolean;
  editable?: boolean;
  canEditName?: (name: string) => boolean;
  onCommit?: (employeeName: string, date: string, raw: string) => Promise<void> | void;
  /** Cài đặt: bấm cột ngày để tô màu */
  onPaintDay?: (day: number) => void;
  onPaintTotal?: () => void;
}) {
  const lastDay = daysInMonth(year, month);
  const days = Array.from({ length: lastDay }, (_, i) => i + 1);
  const mm = String(month).padStart(2, "0");
  const heading = title || `Lịch chấm công — Tháng ${month}/${year}`;
  const today = todayISO();
  const todayDay = today.startsWith(`${year}-${mm}-`)
    ? Number(today.slice(8, 10))
    : 0;
  const todayRing = "relative z-[1] shadow-[inset_0_0_0_3px_#DC2626]";

  const byEmpDate = new Map<string, AttendanceRecord>();
  for (const r of records || []) {
    byEmpDate.set(`${r.employeeName}|${r.date}`, r);
  }
  const byEntry = new Map<string, string>();
  for (const e of entries || []) {
    byEntry.set(`${e.employeeName}|${e.date}`, e.value);
  }
  const useEntries = Boolean(entries);

  const rows = employees.map((emp, index) => {
    const cells: CellValue[] = days.map((day) => {
      const date = `${year}-${mm}-${String(day).padStart(2, "0")}`;
      const key = `${emp.name}|${date}`;
      return useEntries
        ? cellFromEntry(byEntry.get(key))
        : cellFromRecord(byEmpDate.get(key));
    });
    const total = cells.reduce<number>(
      (sum, v) => (typeof v === "number" ? sum + v : sum),
      0
    );
    return { emp, index, cells, total };
  });

  const sameTeam = employees.length > 0 && employees.every((e) => (e.team || "") === (employees[0].team || ""));
  const sameShift = employees.length > 0 && employees.every((e) => (e.shift || "") === (employees[0].shift || ""));

  const th = "border border-neutral-800 px-1 py-1 text-center text-[11px] font-bold leading-tight sm:text-xs";
  const td = "border border-neutral-800 px-1 py-1 text-center text-[11px] leading-tight sm:text-xs";

  const totalStyle = {
    backgroundColor: columnColors.total,
    color: contrastText(columnColors.total),
  };

  const [editing, setEditing] = useState<{ name: string; day: number } | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEdit = (empName: string, day: number, current: CellValue) => {
    if (!editable) return;
    if (canEditName && !canEditName(empName)) return;
    setEditing({ name: empName, day });
    setDraft(current === undefined ? "" : String(current));
  };

  const commitEdit = async () => {
    if (!editing || !onCommit) {
      setEditing(null);
      return;
    }
    const date = `${year}-${mm}-${String(editing.day).padStart(2, "0")}`;
    setSaving(true);
    try {
      await onCommit(editing.name, date, draft);
      setEditing(null);
    } catch {
      /* giữ ô đang sửa khi lưu lỗi */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
        <table className="w-max min-w-full border-collapse text-black">
          <thead>
            <tr>
              <th className={cn(th, "min-w-[220px] bg-white text-left")} colSpan={4}>
                {heading}
              </th>
              {days.map((day) => {
                const bg = weekdayFill(columnColors, year, month, day);
                const isToday = day === todayDay;
                return (
                  <th
                    key={`d-${day}`}
                    className={cn(
                      th,
                      "w-11 min-w-[44px]",
                      isToday && todayRing,
                      onPaintDay && "cursor-pointer hover:ring-2 hover:ring-primary"
                    )}
                    style={{ backgroundColor: bg, color: contrastText(bg) }}
                    title={
                      isToday
                        ? "Hôm nay"
                        : onPaintDay
                          ? `Tô ngày ${day}`
                          : undefined
                    }
                    onClick={onPaintDay ? () => onPaintDay(day) : undefined}
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
              <th
                className={cn(
                  th,
                  "w-16 min-w-[56px]",
                  onPaintTotal && "cursor-pointer hover:ring-2 hover:ring-primary"
                )}
                style={totalStyle}
                title={onPaintTotal ? "Tô cột Tổng" : undefined}
                onClick={onPaintTotal}
              >
                Tổng
              </th>
            </tr>
            <tr>
              <th className={cn(th, "w-12")}>No</th>
              <th className={cn(th, "w-16")}>Team</th>
              <th className={cn(th, "w-[72px]")}>Ca</th>
              <th className={cn(th, "min-w-[140px] text-left")}>
                Họ và Tên
                <br />
                <span className="font-normal text-neutral-500">Full Name</span>
              </th>
              {days.map((day) => {
                const bg = weekdayFill(columnColors, year, month, day);
                const isToday = day === todayDay;
                return (
                  <th
                    key={`w-${day}`}
                    className={cn(
                      th,
                      "w-11 min-w-[44px]",
                      isToday && todayRing,
                      onPaintDay && "cursor-pointer hover:ring-2 hover:ring-primary"
                    )}
                    style={{ backgroundColor: bg, color: contrastText(bg) }}
                    title={
                      isToday
                        ? "Hôm nay"
                        : onPaintDay
                          ? `Tô ngày ${day}`
                          : undefined
                    }
                    onClick={onPaintDay ? () => onPaintDay(day) : undefined}
                  >
                    {WEEKDAY_SHORT[weekdayOf(year, month, day)]}
                  </th>
                );
              })}
              <th
                className={cn(
                  th,
                  "w-16 min-w-[56px]",
                  onPaintTotal && "cursor-pointer hover:ring-2 hover:ring-primary"
                )}
                style={totalStyle}
                title={onPaintTotal ? "Tô cột Tổng" : undefined}
                onClick={onPaintTotal}
              >
                {hoursLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ emp, index, cells, total }) => (
              <tr key={emp.name}>
                <td className={cn(td, "relative font-medium")}>
                  <span className="absolute left-0 top-0 border-t-[7px] border-r-[7px] border-t-green-600 border-r-transparent" />
                  {index + 1}
                </td>
                {(!sameTeam || index === 0) && (
                  <td
                    className={td}
                    rowSpan={sameTeam ? rows.length : undefined}
                  >
                    {emp.team || "—"}
                  </td>
                )}
                {(!sameShift || index === 0) && (
                  <td
                    className={td}
                    rowSpan={sameShift ? rows.length : undefined}
                  >
                    {emp.shift || "—"}
                  </td>
                )}
                <td className={cn(td, "text-left font-medium")}>{emp.name}</td>
                {cells.map((value, i) => {
                  const day = i + 1;
                  const leave = isLeave(value);
                  const bg = leave
                    ? "#000000"
                    : weekdayFill(columnColors, year, month, day);
                  const isEditing =
                    editing?.name === emp.name && editing.day === day;
                  const allow =
                    editable && (!canEditName || canEditName(emp.name));
                  const isToday = day === todayDay;
                  return (
                    <td
                      key={`${emp.name}-${day}`}
                      className={cn(
                        td,
                        "tabular-nums",
                        leave && "font-bold",
                        isToday && todayRing,
                        (allow || onPaintDay) &&
                          "cursor-pointer hover:ring-1 hover:ring-primary"
                      )}
                      style={{
                        backgroundColor: bg,
                        color: leave ? "#ffffff" : contrastText(bg),
                      }}
                      title={
                        isToday
                          ? "Hôm nay"
                          : onPaintDay
                            ? `Tô ngày ${day}`
                            : undefined
                      }
                      onClick={() => {
                        if (allow) startEdit(emp.name, day, value);
                        else onPaintDay?.(day);
                      }}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          aria-label={`OT ${emp.name} ngày ${day}`}
                          value={draft}
                          disabled={saving}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => void commitEdit()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            }
                            if (e.key === "Escape") {
                              setEditing(null);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-6 w-full bg-white px-0.5 text-center text-[11px] text-black outline-none"
                        />
                      ) : value === undefined ? (
                        ""
                      ) : (
                        formatOtDisplay(value)
                      )}
                    </td>
                  );
                })}
                <td
                  className={cn(
                    td,
                    "font-bold tabular-nums",
                    onPaintTotal && "cursor-pointer hover:ring-1 hover:ring-primary"
                  )}
                  style={totalStyle}
                  title={onPaintTotal ? "Tô cột Tổng" : undefined}
                  onClick={onPaintTotal}
                >
                  {total ? total.toFixed(1) : ""}
                </td>
              </tr>
            ))}
            <tr>
              <td className={cn(td, "font-bold")} colSpan={4}>
                {footerLabel}
              </td>
              {days.map((day) => {
                const count = rows.filter(
                  (r) => typeof r.cells[day - 1] === "number"
                ).length;
                const bg = weekdayFill(columnColors, year, month, day);
                const isToday = day === todayDay;
                return (
                  <td
                    key={`t-${day}`}
                    className={cn(
                      td,
                      "font-bold tabular-nums",
                      isToday && todayRing,
                      onPaintDay && "cursor-pointer hover:ring-1 hover:ring-primary"
                    )}
                    style={{ backgroundColor: bg, color: contrastText(bg) }}
                    title={
                      isToday
                        ? "Hôm nay"
                        : onPaintDay
                          ? `Tô ngày ${day}`
                          : undefined
                    }
                    onClick={onPaintDay ? () => onPaintDay(day) : undefined}
                  >
                    {count || ""}
                  </td>
                );
              })}
              <td
                className={cn(
                  td,
                  "font-bold tabular-nums",
                  onPaintTotal && "cursor-pointer hover:ring-1 hover:ring-primary"
                )}
                style={totalStyle}
                title={onPaintTotal ? "Tô cột Tổng" : undefined}
                onClick={onPaintTotal}
              >
                {rows.reduce(
                  (sum, r) =>
                    sum + r.cells.filter((v) => typeof v === "number").length,
                  0
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {showNote && (
        <div className="w-full max-w-xs rounded border border-red-500 bg-[#dceaf7] px-3 py-2 text-sm">
          <p className="mb-1 font-bold underline">Note</p>
          <p>
            <span className="font-bold text-red-600">P</span> {"-->"} Nghỉ phép
          </p>
          <p>
            <span className="font-bold text-red-600">/</span> {"-->"} Nghỉ
          </p>
          <p className="mt-1 text-neutral-600">{noteHours}</p>
        </div>
      )}
    </div>
  );
}
