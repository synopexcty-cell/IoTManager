import {
  mockAttendance,
  mockEmployees,
} from "./mock-data";
import type {
  AttendanceRecord,
  Employee,
  SheetsRequest,
  SheetsResponse,
} from "./types";
import { nowTime, todayISO } from "./utils";

/** In-memory mock — server-only. Never return PIN to clients. */
export async function mockHandler<T>(
  request: SheetsRequest
): Promise<SheetsResponse<T>> {
  await new Promise((r) => setTimeout(r, 150));

  const { action, payload = {} } = request;

  switch (action) {
    case "listEmployees": {
      const data = mockEmployees.map(publicEmployee);
      return { ok: true, data: data as T };
    }
    case "listAttendance": {
      let records = [...mockAttendance];
      const name = payload.name as string | undefined;
      const from = payload.from as string | undefined;
      const to = payload.to as string | undefined;
      if (name) records = records.filter((r) => r.employeeName === name);
      if (from) records = records.filter((r) => r.date >= from);
      if (to) records = records.filter((r) => r.date <= to);
      records.sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.timestamp.localeCompare(a.timestamp)
      );
      return { ok: true, data: records as T };
    }
    case "verifyPin": {
      const emp = mockEmployees.find(
        (e) =>
          e.name === payload.name &&
          e.pin === payload.pin &&
          e.active
      );
      if (!emp) return { ok: false, error: "Tên hoặc mã PIN không đúng" };
      return {
        ok: true,
        data: { name: emp.name, role: emp.role } as T,
      };
    }
    case "checkIn": {
      const name = payload.name as string;
      const date = todayISO();
      const existing = mockAttendance.find(
        (r) => r.employeeName === name && r.date === date
      );
      if (existing?.checkIn) {
        return { ok: false, error: "Bạn đã check-in hôm nay" };
      }
      const record: AttendanceRecord = {
        timestamp: new Date().toISOString(),
        employeeName: name,
        date,
        checkIn: nowTime(),
        checkOut: "",
        status: "checked_in",
        note: (payload.note as string) || "",
      };
      mockAttendance.unshift(record);
      return { ok: true, data: record as T };
    }
    case "checkOut": {
      const name = payload.name as string;
      const date = todayISO();
      const existing = mockAttendance.find(
        (r) => r.employeeName === name && r.date === date
      );
      if (!existing || !existing.checkIn) {
        return { ok: false, error: "Bạn chưa check-in hôm nay" };
      }
      if (existing.checkOut) {
        return { ok: false, error: "Bạn đã check-out hôm nay" };
      }
      existing.checkOut = nowTime();
      existing.status = "checked_out";
      return { ok: true, data: existing as T };
    }
    case "addEmployee": {
      const profile = parseProfile_(payload);
      if (!profile.ok) return { ok: false, error: profile.error };
      const { name, pin, role, employeeCode, phone, cccd, address } =
        profile.data;
      if (!pin || !/^\d{4}$/.test(pin)) {
        return { ok: false, error: "Tên, mã NV và PIN 4 số là bắt buộc" };
      }
      if (mockEmployees.some((e) => e.name === name)) {
        return { ok: false, error: "Họ tên đã tồn tại" };
      }
      if (mockEmployees.some((e) => e.employeeCode === employeeCode)) {
        return { ok: false, error: "Mã nhân viên đã tồn tại" };
      }
      const emp: Employee = {
        name,
        pin,
        role,
        active: true,
        employeeCode,
        phone,
        cccd,
        address,
      };
      mockEmployees.push(emp);
      return { ok: true, data: publicEmployee(emp) as T };
    }
    case "updateEmployee": {
      const originalName = String(payload.originalName || "").trim();
      const profile = parseProfile_(payload);
      if (!profile.ok) return { ok: false, error: profile.error };
      const { name, pin: pinRaw, role, employeeCode, phone, cccd, address } =
        profile.data;
      const active =
        payload.active !== false && String(payload.active) !== "false";
      if (!originalName) {
        return { ok: false, error: "Thiếu tên nhân viên gốc" };
      }
      if (pinRaw && !/^\d{4}$/.test(pinRaw)) {
        return { ok: false, error: "PIN phải gồm 4 chữ số" };
      }
      const idx = mockEmployees.findIndex((e) => e.name === originalName);
      if (idx < 0) return { ok: false, error: "Không tìm thấy nhân viên" };
      if (
        name !== originalName &&
        mockEmployees.some((e) => e.name === name)
      ) {
        return { ok: false, error: "Họ tên đã tồn tại" };
      }
      if (
        mockEmployees.some(
          (e, i) => i !== idx && e.employeeCode === employeeCode
        )
      ) {
        return { ok: false, error: "Mã nhân viên đã tồn tại" };
      }
      const prev = mockEmployees[idx];
      const emp: Employee = {
        name,
        pin: pinRaw || prev.pin || "",
        role,
        active: Boolean(active),
        employeeCode,
        phone,
        cccd,
        address,
      };
      mockEmployees[idx] = emp;
      if (name !== originalName) {
        for (const rec of mockAttendance) {
          if (rec.employeeName === originalName) rec.employeeName = name;
        }
      }
      return { ok: true, data: publicEmployee(emp) as T };
    }
    case "deleteEmployee": {
      const name = payload.name as string;
      const idx = mockEmployees.findIndex((e) => e.name === name);
      if (idx < 0) return { ok: false, error: "Không tìm thấy nhân viên" };
      mockEmployees.splice(idx, 1);
      return { ok: true, data: { name } as T };
    }
    case "deactivateEmployee": {
      const name = payload.name as string;
      const emp = mockEmployees.find((e) => e.name === name);
      if (!emp) return { ok: false, error: "Không tìm thấy nhân viên" };
      emp.active = false;
      return { ok: true, data: publicEmployee(emp) as T };
    }
    default:
      return { ok: false, error: `Unknown action: ${action}` };
  }
}

function parseProfile_(payload: Record<string, unknown>):
  | {
      ok: true;
      data: {
        name: string;
        pin: string;
        role: Employee["role"];
        employeeCode: string;
        phone: string;
        cccd: string;
        address: string;
      };
    }
  | { ok: false; error: string } {
  const name = String(payload.name || "").trim();
  const pin = String(payload.pin ?? "").trim();
  const role = (payload.role as Employee["role"]) || "employee";
  const employeeCode = String(payload.employeeCode || "").trim();
  const phone = String(payload.phone || "").trim();
  const cccd = String(payload.cccd || "").trim();
  const address = String(payload.address || "").trim();
  if (!name || !employeeCode) {
    return { ok: false, error: "Họ tên và mã nhân viên là bắt buộc" };
  }
  return {
    ok: true,
    data: { name, pin, role, employeeCode, phone, cccd, address },
  };
}

function publicEmployee(emp: Employee) {
  return {
    name: emp.name,
    role: emp.role,
    active: emp.active,
    employeeCode: emp.employeeCode || "",
    phone: emp.phone || "",
    cccd: emp.cccd || "",
    address: emp.address || "",
  };
}
