import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** PIN đăng nhập: 4–6 chữ số */
export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
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
