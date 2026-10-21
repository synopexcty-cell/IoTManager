/** Chỉ 2 bữa/ngày: trưa (T) và chiều (C). */

export type MealKind = "lunch" | "dinner";

export function asMealFlag(value: unknown): boolean {
  if (value === true || value === 1) return true;
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  return s === "true" || s === "1" || s === "t" || s === "c" || s === "x";
}

export function parseMealRecord(raw: unknown): {
  lunch: boolean;
  dinner: boolean;
} {
  if (!raw || typeof raw !== "object") {
    return { lunch: false, dinner: false };
  }
  const o = raw as Record<string, unknown>;
  return {
    lunch: asMealFlag(o.lunch),
    dinner: asMealFlag(o.dinner ?? o.afternoon),
  };
}

export function mealCount(lunch: boolean, dinner: boolean): number {
  return Number(lunch) + Number(dinner);
}

export function formatMealCell(lunch: boolean, dinner: boolean): string {
  if (lunch && dinner) return "T C";
  if (lunch) return "T";
  if (dinner) return "C";
  return "";
}
