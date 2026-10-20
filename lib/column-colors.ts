import type { ColumnColors } from "./types";

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

export function normalizeColumnColors(raw: unknown): ColumnColors {
  const src =
    raw && typeof raw === "object" ? (raw as Partial<ColumnColors>) : {};
  const list = Array.isArray(src.weekdays) ? src.weekdays : [];
  return {
    weekdays: DEFAULT_COLUMN_COLORS.weekdays.map((fallback, i) =>
      normalizeHexColor(list[i], fallback)
    ),
    total: normalizeHexColor(src.total, DEFAULT_COLUMN_COLORS.total),
  };
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
