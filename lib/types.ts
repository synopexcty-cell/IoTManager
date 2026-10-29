export type Role = "employee" | "admin" | "hr" | "accountant" | "viewer";

export type AttendanceStatus = "checked_in" | "checked_out" | "absent";

export interface Employee {
  name: string;
  /** Chỉ lưu trên server — API không trả PIN về client */
  pin?: string;
  role: Role;
  active: boolean;
  /** Mã nhân viên (unique) */
  employeeCode: string;
  phone: string;
  cccd: string;
  address: string;
  /** Nam | Nữ | "" */
  gender?: string;
  /** yyyy-MM-dd */
  birthDate?: string;
  team?: string;
  shift?: string;
  /** true = lần đầu / mật khẩu tạm, bắt đổi khi đăng nhập */
  mustChangePassword?: boolean;
}

export interface AttendanceRecord {
  timestamp: string;
  employeeName: string;
  date: string; // yyyy-MM-dd
  checkIn: string; // HH:mm or empty
  checkOut: string; // HH:mm or empty
  status: AttendanceStatus;
  note: string;
}

export interface OtRecord {
  employeeName: string;
  date: string; // yyyy-MM-dd
  /** "1.5" | "P" | "/" */
  value: string;
  updatedAt: string;
}

export interface MealRecord {
  employeeName: string;
  date: string; // yyyy-MM-dd
  /** Ăn trưa */
  lunch: boolean;
  /** Ăn chiều */
  dinner: boolean;
  updatedAt: string;
}

export interface AuthUser {
  name: string;
  role: Role;
  employeeCode?: string;
  mustChangePassword?: boolean;
  token?: string;
}

export interface ColumnColors {
  /** 7 màu: index 0 = CN … 6 = T7 — fallback khi chưa tô từng ngày */
  weekdays: string[];
  total: string;
  /** Màu từng cột ngày trong tháng, key = "1".."31" */
  days?: Record<string, string>;
}

/** Khoảng giờ VN (yyyy-MM-ddTHH:mm) nhân viên được đăng ký OT */
export interface OtWindow {
  from: string;
  to: string;
}

export interface AppSettings {
  /** Màu mặc định khi tháng chưa được cấu hình */
  columnColors: ColumnColors;
  /** key = yyyy-MM */
  monthColors?: Record<string, ColumnColors>;
  /** null = đóng, nhân viên không đăng ký được */
  otWindow?: OtWindow | null;
}

export type SheetsAction =
  | "listEmployees"
  | "listAttendance"
  | "checkIn"
  | "checkOut"
  | "saveAttendance"
  | "listOt"
  | "saveOt"
  | "listMeals"
  | "saveMeal"
  | "addEmployee"
  | "importEmployees"
  | "updateEmployee"
  | "deleteEmployee"
  | "deactivateEmployee"
  | "verifyPin"
  | "listLoginRoster"
  | "changePassword"
  | "getSettings"
  | "updateSettings";

export interface LoginRosterItem {
  employeeCode: string;
  name: string;
}

export interface SheetsRequest {
  action: SheetsAction;
  payload?: Record<string, unknown>;
}

export interface SheetsResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface QueuedRequest {
  id: string;
  request: SheetsRequest;
  createdAt: string;
}
