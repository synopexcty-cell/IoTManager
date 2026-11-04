import { foldVi } from "./utils";

/** Mọi tài khoản thuộc SYNOPEX (cty nhà) */
export const HOME_COMPANY = "SYNOPEX" as const;

/**
 * Nơi làm việc trong ngày / nơi OT:
 * SYNOPEX = cty nhà, SIFLEX = công trường.
 */
export const WORKPLACES = ["SIFLEX", "SYNOPEX"] as const;
export type Workplace = (typeof WORKPLACES)[number] | "";

export function parseWorkplace(raw: unknown): Workplace {
  const s = foldVi(String(raw ?? ""));
  if (!s) return "";
  if (s.includes("siflex") || s === "sf") return "SIFLEX";
  if (
    s.includes("synopex") ||
    s.includes("synope") ||
    s === "sx" ||
    s === "snx"
  ) {
    return "SYNOPEX";
  }
  return "";
}

export function workplaceShort(raw: unknown): string {
  const w = parseWorkplace(raw);
  if (w === "SIFLEX") return "SF";
  if (w === "SYNOPEX") return "SX";
  return "";
}

export function workplaceLabel(raw: unknown): string {
  const w = parseWorkplace(raw);
  if (w === "SIFLEX") return "SIFLEX (công trường)";
  if (w === "SYNOPEX") return "SYNOPEX (cty nhà)";
  return "";
}
