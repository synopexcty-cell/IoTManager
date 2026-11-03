import type { AppSettings, OtMonthLock } from "./types";

export function otMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function otMonthKeyFromDate(date: string): string {
  return date.slice(0, 7);
}

export function normalizeOtMonthLocks(
  raw: unknown
): Record<string, OtMonthLock> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, OtMonthLock> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}$/.test(key)) continue;
    if (!value || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;
    const lockedAt = String(v.lockedAt || "").trim();
    const lockedBy = String(v.lockedBy || "").trim();
    if (!lockedAt || !lockedBy) continue;
    const note = String(v.note || "").trim();
    out[key] = note
      ? { lockedAt, lockedBy, note }
      : { lockedAt, lockedBy };
  }
  return out;
}

export function getOtMonthLock(
  settings: Pick<AppSettings, "otMonthLocks"> | null | undefined,
  year: number,
  month: number
): OtMonthLock | null {
  const key = otMonthKey(year, month);
  return settings?.otMonthLocks?.[key] || null;
}

export function isOtMonthLocked(
  settings: Pick<AppSettings, "otMonthLocks"> | null | undefined,
  year: number,
  month: number
): boolean {
  return Boolean(getOtMonthLock(settings, year, month));
}

export function isOtDateLocked(
  settings: Pick<AppSettings, "otMonthLocks"> | null | undefined,
  date: string
): boolean {
  const key = otMonthKeyFromDate(date);
  return Boolean(settings?.otMonthLocks?.[key]);
}

export function formatOtLockTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mi} ${dd}/${mm}/${yyyy}`;
  } catch {
    return iso;
  }
}

export function otMonthLockedMessage(
  year: number,
  month: number,
  lock?: OtMonthLock | null
): string {
  const label = `tháng ${month}/${year}`;
  if (!lock) return `Lịch OT ${label} đã chốt.`;
  return `Lịch OT ${label} đã chốt bởi ${lock.lockedBy} lúc ${formatOtLockTime(lock.lockedAt)}.`;
}

export function otMonthLockedEmployeeBlockMessage(
  year: number,
  month: number
): string {
  return `Lịch OT tháng ${month}/${year} đã chốt — không sửa được. Liên hệ quản trị nếu sai.`;
}
