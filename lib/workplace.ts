import { foldVi } from "./utils";

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

/** Đơn vị nhân viên thuộc về (người của SIFLEX / SYNOPEX) */
export function employeeCompany(emp: {
  company?: string;
  workplace?: string;
}): Workplace {
  return parseWorkplace(emp.company || emp.workplace);
}

export function matchesCompany(
  emp: { company?: string; workplace?: string },
  filter: string
): boolean {
  if (!filter) return true;
  return employeeCompany(emp) === filter;
}
