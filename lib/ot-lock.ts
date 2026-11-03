import type { AppSettings, OtDayLock } from "./types";
import { formatShortDate } from "./utils";

export function normalizeOtDayLocks(
  raw: unknown
): Record<string, OtDayLock> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, OtDayLock> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
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

/** Đọc cả khóa ngày mới và (legacy) khóa tháng cũ — không còn dùng month lock */
export function getOtDayLock(
  settings: Pick<AppSettings, "otDayLocks"> | null | undefined,
  date: string
): OtDayLock | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return settings?.otDayLocks?.[date] || null;
}

export function isOtDayLocked(
  settings: Pick<AppSettings, "otDayLocks"> | null | undefined,
  date: string
): boolean {
  return Boolean(getOtDayLock(settings, date));
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

/** Nhãn ngắn cho mọi user: đã chốt / chưa chốt ngày đó */
export function otDayLockLabel(
  date: string,
  lock?: OtDayLock | null
): string {
  const day = formatShortDate(date);
  if (!lock) return `Ngày ${day}: chưa chốt`;
  return `Ngày ${day}: ${lock.lockedBy} đã chốt lúc ${formatOtLockTime(lock.lockedAt)}`;
}

export function otDayLockedEmployeeBlockMessage(date: string): string {
  return `Lịch OT ngày ${formatShortDate(date)} đã chốt — không sửa được. Liên hệ quản trị nếu sai.`;
}
