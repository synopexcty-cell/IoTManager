import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Mật khẩu / PIN: 4–8 chữ số */
export function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}

export function normalizeEmployeeCode(code: string): string {
  return code.trim().toUpperCase();
}

/** "8:05" → "08:05"; không hợp lệ → "" */
export function normalizeTime(raw: unknown): string {
  const s = String(raw ?? "").trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return "";
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return "";
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function stripVi(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

/** Chuẩn hóa giới tính: Nam / Nữ / "" */
export function parseGender(raw: unknown): string {
  const s = stripVi(String(raw ?? ""));
  if (!s) return "";
  if (["nam", "male", "m", "boy", "1"].includes(s)) return "Nam";
  if (["nu", "female", "f", "girl", "0", "2"].includes(s)) return "Nữ";
  return "";
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(year: number, month: number, day: number): string {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return "";
  }
  const dt = new Date(year, month - 1, day);
  if (
    dt.getFullYear() !== year ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day
  ) {
    return "";
  }
  const now = new Date();
  if (year < 1920 || dt > now) return "";
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Nhận Date, serial Excel, yyyy-MM-dd hoặc dd/MM/yyyy → yyyy-MM-dd */
export function parseBirthDate(raw: unknown): string {
  if (raw == null || raw === "") return "";
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return ymd(raw.getFullYear(), raw.getMonth() + 1, raw.getDate());
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw > 15000 && raw < 80000) {
      const utc = Date.UTC(1899, 11, 30) + Math.round(raw) * 86400000;
      const d = new Date(utc);
      return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
    return "";
  }
  const s = String(raw).trim();
  if (!s) return "";
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return ymd(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return ymd(Number(m[3]), Number(m[2]), Number(m[1]));
  return "";
}

/** Vercel ở Mỹ — luôn tính theo VN */
export const APP_TZ = "Asia/Ho_Chi_Minh";

function vnParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value || "";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

export function todayISO(date = new Date()): string {
  const p = vnParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

export function nowTime(date = new Date()): string {
  const p = vnParts(date);
  return `${p.hour}:${p.minute}`;
}

/** Cộng/trừ ngày trên chuỗi yyyy-MM-dd (không phụ thuộc TZ máy). */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  const last = daysInMonth(year, month);
  const mm = String(month).padStart(2, "0");
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(last).padStart(2, "0")}`,
  };
}

/** 0 = CN … 6 = T7 */
export function weekdayOf(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay();
}

export function workedHours(checkIn: string, checkOut: string): number | null {
  const parse = (s: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const a = parse(checkIn);
  const b = parse(checkOut);
  if (a == null || b == null) return null;
  let d = b - a;
  if (d < 0) d += 24 * 60;
  return Math.round((d / 60) * 10) / 10;
}

export function formatDateVi(dateStr: string): string {
  try {
    return format(new Date(dateStr + "T00:00:00"), "EEEE, dd/MM/yyyy", {
      locale: vi,
    });
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string): string {
  try {
    return format(new Date(dateStr + "T00:00:00"), "dd/MM/yyyy");
  } catch {
    return dateStr;
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "checked_in":
      return "Đã vào";
    case "checked_out":
      return "Đã ra";
    case "absent":
      return "Chưa chấm";
    default:
      return status;
  }
}
