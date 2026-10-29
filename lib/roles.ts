import type { Employee, Role } from "./types";
import { foldVi } from "./utils";

const VIEW_ROLES: Role[] = ["hr", "accountant", "viewer"];

export function isKnownRole(role: unknown): role is Role {
  return (
    role === "admin" ||
    role === "employee" ||
    role === "hr" ||
    role === "accountant" ||
    role === "viewer"
  );
}

export function parseRole(raw: unknown): Role {
  const s = foldVi(String(raw ?? ""));
  if (!s) return "employee";
  if (
    s.includes("admin") ||
    s.includes("quan tri") ||
    s.includes("quantri") ||
    s === "ql"
  ) {
    return "admin";
  }
  if (
    s === "hr" ||
    s.includes("nhan su") ||
    s.includes("nhansu") ||
    s.includes("human resource")
  ) {
    return "hr";
  }
  if (
    s.includes("ke toan") ||
    s.includes("ketoan") ||
    s.includes("accountant") ||
    s.includes("accounting")
  ) {
    return "accountant";
  }
  if (
    s.includes("viewer") ||
    s.includes("chi xem") ||
    s.includes("chixem") ||
    s.includes("readonly") ||
    s.includes("read only") ||
    s === "xem" ||
    s === "view"
  ) {
    return "viewer";
  }
  return "employee";
}

export function roleLabel(role?: Role | string | null): string {
  if (role === "admin") return "Quản trị";
  if (role === "hr") return "HR";
  if (role === "accountant") return "Kế toán";
  if (role === "viewer") return "Chỉ xem";
  return "Nhân viên";
}

export function isAdmin(role?: Role | string | null): boolean {
  return role === "admin";
}

/** HR / Kế toán / chỉ xem — xem toàn bộ, không sửa */
export function isViewOnly(role?: Role | string | null): boolean {
  return VIEW_ROLES.includes(role as Role);
}

export const isViewer = isViewOnly;

export function canSeeAll(role?: Role | string | null): boolean {
  return role === "admin" || isViewOnly(role);
}

/** Nhân viên / quản trị hiện trên bảng công, OT, ăn ngoài */
export function workingStaff(emps: Employee[]): Employee[] {
  return emps.filter((e) => e.active && !isViewOnly(e.role));
}
