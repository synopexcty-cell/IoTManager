import type { AppSettings, ColumnColors } from "./types";
import { daysInMonth, weekdayOf } from "./utils";

export function monthColorKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** 0 = Chủ nhật … 6 = Thứ 7 */
export const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;

export const WEEKDAY_LABELS = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
] as const;

/** Mặc định: không tô T2–T6; CN/T7 trống để admin tự chọn. Cột Tổng giữ vàng nhạt. */
export const DEFAULT_COLUMN_COLORS: ColumnColors = {
  weekdays: [
    "#ffffff",
    "#ffffff",
    "#ffffff",
    "#ffffff",
    "#ffffff",
    "#ffffff",
    "#ffffff",
  ],
  total: "#fff1a6",
};

export function normalizeHexColor(
  input: unknown,
  fallback = "#ffffff"
): string {
  if (typeof input !== "string") return fallback;
  let s = input.trim();
  if (!s) return fallback;
  if (!s.startsWith("#")) s = `#${s}`;
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  }
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  return fallback;
}

function normalizeDays(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const day = Number(key);
    if (!Number.isInteger(day) || day < 1 || day > 31) continue;
    out[String(day)] = normalizeHexColor(value);
  }
  return out;
}

export function normalizeColumnColors(raw: unknown): ColumnColors {
  const src =
    raw && typeof raw === "object" ? (raw as Partial<ColumnColors>) : {};
  const list = Array.isArray(src.weekdays) ? src.weekdays : [];
  return {
    weekdays: DEFAULT_COLUMN_COLORS.weekdays.map((fallback, i) =>
      normalizeHexColor(list[i], fallback)
    ),
    total: normalizeHexColor(src.total, DEFAULT_COLUMN_COLORS.total),
    days: normalizeDays(src.days),
  };
}

/** Màu một cột ngày: ưu tiên tô từng ngày, không có thì theo thứ */
export function dayFill(
  colors: ColumnColors,
  year: number,
  month: number,
  day: number
): string {
  const override = colors.days?.[String(day)];
  if (override) return normalizeHexColor(override);
  const wd = weekdayOf(year, month, day);
  return colors.weekdays[wd] || "#ffffff";
}

/** Đổ màu từng cột từ màu thứ — dùng khi mở bảng cài đặt */
export function expandDayColors(
  colors: ColumnColors,
  year: number,
  month: number
): ColumnColors {
  const base = normalizeColumnColors(colors);
  const last = daysInMonth(year, month);
  const days: Record<string, string> = { ...base.days };
  for (let d = 1; d <= last; d++) {
    const key = String(d);
    if (!days[key]) days[key] = dayFill(base, year, month, d);
  }
  return { ...base, days };
}

export function normalizeMonthColors(
  raw: unknown
): Record<string, ColumnColors> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, ColumnColors> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}$/.test(key)) continue;
    out[key] = normalizeColumnColors(value);
  }
  return out;
}

export function colorsForMonth(
  settings: Pick<AppSettings, "columnColors" | "monthColors">,
  year: number,
  month: number
): ColumnColors {
  const saved = settings.monthColors?.[monthColorKey(year, month)];
  if (saved) return normalizeColumnColors(saved);
  return normalizeColumnColors(settings.columnColors);
}

/** Chữ đen/trắng tùy độ sáng nền */
export function contrastText(hex: string): string {
  const n = normalizeHexColor(hex);
  const r = parseInt(n.slice(1, 3), 16);
  const g = parseInt(n.slice(3, 5), 16);
  const b = parseInt(n.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.55 ? "#ffffff" : "#000000";
}
