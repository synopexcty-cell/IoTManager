export type Role = "employee" | "admin";

export type AttendanceStatus = "checked_in" | "checked_out" | "absent";

export interface Employee {
  name: string;
  pin: string;
  role: Role;
  active: boolean;
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

export interface AuthUser {
  name: string;
  role: Role;
}

export type SheetsAction =
  | "listEmployees"
  | "listAttendance"
  | "checkIn"
  | "checkOut"
  | "addEmployee"
  | "deactivateEmployee"
  | "verifyPin";

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
