import type { OtWindow } from "./types";

/** VN không DST — datetime-local hiểu theo giờ Việt Nam */
const VN_OFFSET = "+07:00";
const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/;

function toMinute(raw: string): string {
  const m = LOCAL_RE.exec(raw.trim());
  if (!m) return "";
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`;
}

export function normalizeOtWindow(raw: unknown): OtWindow | null {
  if (raw == null) return null;
  if (typeof raw !== "object") return null;
  const from = toMinute(String((raw as { from?: unknown }).from || ""));
  const to = toMinute(String((raw as { to?: unknown }).to || ""));
  if (!from || !to) return null;
  const a = otWindowMs(from);
  const b = otWindowMs(to);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) return null;
  return { from, to };
}

export function otWindowMs(local: string): number {
  return Date.parse(`${local}:00${VN_OFFSET}`);
}

export function isOtWindowOpen(
  window: OtWindow | null | undefined,
  now = Date.now()
): boolean {
  if (!window) return false;
  const a = otWindowMs(window.from);
  const b = otWindowMs(window.to);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return now >= a && now <= b;
}

export function otWindowStatus(
  window: OtWindow | null | undefined,
  now = Date.now()
): "closed" | "upcoming" | "open" | "ended" {
  if (!window) return "closed";
  const a = otWindowMs(window.from);
  const b = otWindowMs(window.to);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) return "closed";
  if (now < a) return "upcoming";
  if (now > b) return "ended";
  return "open";
}

export function formatOtLocal(local: string): string {
  const m = LOCAL_RE.exec(local);
  if (!m) return local;
  return `${m[4]}:${m[5]} ${m[3]}/${m[2]}/${m[1]}`;
}

export function employeeOtBlockedMessage(
  window: OtWindow | null | undefined,
  now = Date.now()
): string {
  const status = otWindowStatus(window, now);
  if (status === "open") return "";
  if (status === "upcoming" && window) {
    return `Đăng ký OT chưa mở. Mở lúc ${formatOtLocal(window.from)}.`;
  }
  if (status === "ended" && window) {
    return `Đã hết hạn đăng ký OT (${formatOtLocal(window.to)}). Liên hệ quản trị.`;
  }
  return "Chưa mở đăng ký OT. Liên hệ quản trị.";
}
