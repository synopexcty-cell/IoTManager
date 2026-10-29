import { formatOtDisplay } from "./ot";
import type { AttendanceRecord } from "./types";
import { workedHours } from "./utils";
import { parseWorkplace, workplaceShort } from "./workplace";

export type GridCellValue = number | "P" | "/" | string | undefined;

export function attendanceCellValue(rec?: AttendanceRecord): GridCellValue {
  if (!rec) return undefined;
  const note = (rec.note || "").trim().toUpperCase();
  if (note === "P" || note.includes("PHÉP") || note.includes("PHEP")) return "P";
  if (note === "/") return "/";
  const hours = workedHours(rec.checkIn, rec.checkOut);
  if (hours != null) return hours;
  if (rec.checkIn) return rec.checkIn;
  return undefined;
}

export function otCellValue(raw?: string): GridCellValue {
  if (!raw) return undefined;
  if (raw === "P" || raw === "/") return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : raw;
}

export function isLeaveCell(value: GridCellValue) {
  return value === "P" || value === "/";
}

/** Text trong ô ngày: giờ (hoặc P /) + dòng nơi làm SF/SX */
export function attendanceCellText(
  value: GridCellValue,
  workplace?: string
): string {
  if (value === undefined) {
    const site = workplaceShort(workplace);
    return site;
  }
  const main = formatOtDisplay(value);
  const site = workplaceShort(workplace);
  return site ? `${main}\n${site}` : main;
}

export function recordWorkplace(rec?: AttendanceRecord): string {
  return parseWorkplace(rec?.workplace);
}
