import type { AttendanceRecord, Employee } from "@/lib/types";
import { daysInMonth, weekdayOf, workedHours } from "@/lib/utils";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

type CellValue = number | "P" | "/" | string | undefined;

function dayTone(year: number, month: number, day: number) {
  const wd = weekdayOf(year, month, day);
  if (wd === 0) return "bg-[#ed7d31]";
  if (wd === 6) return "bg-[#ffc000]";
  return "";
}

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

function isLeave(value: CellValue) {
  return value === "P" || value === "/";
}

export function MonthGrid({
  year,
  month,
  employees,
  records,
}: {
  year: number;
  month: number;
  employees: Employee[];
  records: AttendanceRecord[];
}) {
  const lastDay = daysInMonth(year, month);
  const days = Array.from({ length: lastDay }, (_, i) => i + 1);
  const mm = String(month).padStart(2, "0");

  const byEmpDate = new Map<string, AttendanceRecord>();
  for (const r of records) {
    byEmpDate.set(`${r.employeeName}|${r.date}`, r);
  }

  const rows = employees.map((emp, index) => {
    const cells: CellValue[] = days.map((day) => {
      const date = `${year}-${mm}-${String(day).padStart(2, "0")}`;
      return cellFromRecord(byEmpDate.get(`${emp.name}|${date}`));
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

  return (
    <div className="space-y-3">
      <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
        <table className="w-max min-w-full border-collapse text-black">
          <thead>
            <tr>
              <th className={cn(th, "min-w-[220px] bg-white text-left")} colSpan={4}>
                Lịch chấm công — Tháng {month}/{year}
              </th>
              {days.map((day) => (
                <th
                  key={`d-${day}`}
                  className={cn(th, "w-11 min-w-[44px]", dayTone(year, month, day))}
                >
                  {day}
                </th>
              ))}
              <th className={cn(th, "w-16 min-w-[56px] bg-[#fff1a6]")}>Tổng</th>
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
              {days.map((day) => (
                <th
                  key={`w-${day}`}
                  className={cn(th, "w-11 min-w-[44px]", dayTone(year, month, day))}
                >
                  {WEEKDAYS[weekdayOf(year, month, day)]}
                </th>
              ))}
              <th className={cn(th, "w-16 min-w-[56px] bg-[#fff1a6]")}>Giờ</th>
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
                  return (
                    <td
                      key={`${emp.name}-${day}`}
                      className={cn(
                        td,
                        "tabular-nums",
                        dayTone(year, month, day),
                        leave && "bg-black font-bold text-white"
                      )}
                    >
                      {value === undefined ? "" : value}
                    </td>
                  );
                })}
                <td className={cn(td, "bg-[#fff1a6] font-bold tabular-nums")}>
                  {total ? total.toFixed(1) : ""}
                </td>
              </tr>
            ))}
            <tr>
              <td className={cn(td, "font-bold")} colSpan={4}>
                Tổng người có mặt
              </td>
              {days.map((day) => {
                const count = rows.filter(
                  (r) => typeof r.cells[day - 1] === "number"
                ).length;
                return (
                  <td
                    key={`t-${day}`}
                    className={cn(
                      td,
                      "font-bold tabular-nums",
                      dayTone(year, month, day)
                    )}
                  >
                    {count || ""}
                  </td>
                );
              })}
              <td className={cn(td, "bg-[#fff1a6] font-bold tabular-nums")}>
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

      <div className="w-full max-w-xs rounded border border-red-500 bg-[#dceaf7] px-3 py-2 text-sm">
        <p className="mb-1 font-bold underline">Note</p>
        <p>
          <span className="font-bold text-red-600">P</span> {"-->"} Nghỉ phép
        </p>
        <p>
          <span className="font-bold text-red-600">/</span> {"-->"} Nghỉ
        </p>
        <p className="mt-1 text-neutral-600">Số = số giờ làm (vào → ra)</p>
      </div>
    </div>
  );
}
