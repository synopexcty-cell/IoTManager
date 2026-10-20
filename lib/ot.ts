/** Chuẩn hóa ô OT: số giờ (0–24), P, / hoặc rỗng. null = không hợp lệ */
export function parseOtValue(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const u = s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Đ/g, "D");
  if (u === "P" || u === "PHEP" || u.includes("PHEP")) return "P";
  if (u === "/") return "/";
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 24) return null;
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatOtDisplay(value: string | number | undefined): string {
  if (value === undefined || value === "") return "";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  return String(value);
}
