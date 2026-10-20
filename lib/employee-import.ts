import * as XLSX from "xlsx";
import { isValidPin, normalizeEmployeeCode } from "./utils";

export type ImportRow = {
  employeeCode: string;
  name: string;
  pin: string;
  phone: string;
  cccd: string;
  address: string;
  team: string;
  shift: string;
  role: "employee" | "admin";
  error?: string;
};

const HEADER_MAP: Record<string, keyof ImportRow> = {
  manv: "employeeCode",
  manhanvien: "employeeCode",
  employeecode: "employeeCode",
  code: "employeeCode",
  id: "employeeCode",
  hoten: "name",
  hovaten: "name",
  ten: "name",
  name: "name",
  fullname: "name",
  pin: "pin",
  matkhau: "pin",
  password: "pin",
  sdt: "phone",
  sodienthoai: "phone",
  phone: "phone",
  dienthoai: "phone",
  cccd: "cccd",
  cmnd: "cccd",
  cccdcmnd: "cccd",
  diachi: "address",
  address: "address",
  team: "team",
  nhom: "team",
  phongban: "team",
  ca: "shift",
  shift: "shift",
  vaitro: "role",
  role: "role",
  chucvu: "role",
};

function strip(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");
}

function cellStr(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "number" && Number.isFinite(v)) {
    if (Number.isInteger(v)) return String(v);
    return String(v);
  }
  return String(v).trim();
}

function parseRole(raw: string): "employee" | "admin" {
  const s = strip(raw);
  if (s.includes("admin") || s.includes("quantri") || s === "ql") return "admin";
  return "employee";
}

export const IMPORT_HEADERS = [
  "Mã NV",
  "Họ và tên",
  "PIN",
  "SĐT",
  "CCCD",
  "Địa chỉ",
  "Team",
  "Ca",
  "Vai trò",
] as const;

export function downloadEmployeeTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    [...IMPORT_HEADERS],
    [
      "VT007925",
      "Nguyễn Văn A",
      "1234",
      "0901234567",
      "079085001234",
      "Quận 1, TP.HCM",
      "IOT",
      "Hành chính",
      "employee",
    ],
  ]);
  ws["!cols"] = IMPORT_HEADERS.map((_, i) => ({
    wch: [12, 22, 8, 14, 16, 24, 10, 14, 12][i],
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "NhanVien");
  XLSX.writeFile(wb, "mau-nhan-vien.xlsx");
}

export async function parseEmployeeFile(file: File): Promise<ImportRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  if (matrix.length < 2) return [];

  const headerRow = (matrix[0] || []).map((h) => strip(cellStr(h)));
  const colIndex: Partial<Record<keyof ImportRow, number>> = {};
  headerRow.forEach((h, i) => {
    const key = HEADER_MAP[h];
    if (key && colIndex[key] == null) colIndex[key] = i;
  });

  const rows: ImportRow[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const line = matrix[r] || [];
    const get = (k: keyof ImportRow) =>
      colIndex[k] == null ? "" : cellStr(line[colIndex[k]!]);

    const employeeCode = normalizeEmployeeCode(get("employeeCode"));
    const name = get("name");
    if (!employeeCode && !name) continue;

    const pin = get("pin") || "1234";
    const role = parseRole(get("role"));
    const row: ImportRow = {
      employeeCode,
      name,
      pin,
      phone: get("phone"),
      cccd: get("cccd"),
      address: get("address"),
      team: get("team"),
      shift: get("shift"),
      role,
    };

    if (!employeeCode || !name) {
      row.error = "Thiếu mã NV hoặc họ tên";
    } else if (!isValidPin(pin)) {
      row.error = "Mật khẩu phải 4–8 số";
    }
    rows.push(row);
  }
  return rows;
}
