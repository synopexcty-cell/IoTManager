import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function nowTime(): string {
  return format(new Date(), "HH:mm");
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
