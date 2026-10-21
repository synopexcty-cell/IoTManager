import { todayISO } from "./utils";

/** 0 = tháng đang xem không chứa hôm nay */
export function todayDayOf(year: number, month: number): number {
  const today = todayISO();
  const mm = String(month).padStart(2, "0");
  return today.startsWith(`${year}-${mm}-`) ? Number(today.slice(8, 10)) : 0;
}

/** Một viền đỏ liền cho cả cột ngày hôm nay */
export const todayCol = {
  edge: "relative z-[1] shadow-[inset_3px_0_0_#DC2626,inset_-3px_0_0_#DC2626]",
  top: "relative z-[1] shadow-[inset_3px_0_0_#DC2626,inset_-3px_0_0_#DC2626,inset_0_3px_0_#DC2626]",
  bottom:
    "relative z-[1] shadow-[inset_3px_0_0_#DC2626,inset_-3px_0_0_#DC2626,inset_0_-3px_0_#DC2626]",
} as const;
