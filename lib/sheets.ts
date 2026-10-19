import { enqueue, getQueue, setQueue } from "./offline-queue";
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

const WEBAPP_URL = process.env.NEXT_PUBLIC_SHEETS_WEBAPP_URL?.trim() || "";

export function isMockMode(): boolean {
  return !WEBAPP_URL;
}

async function mockHandler<T>(
  request: SheetsRequest
): Promise<SheetsResponse<T>> {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 250));

  const { action, payload = {} } = request;

  switch (action) {
    case "listEmployees": {
      return { ok: true, data: [...mockEmployees] as T };
    }
    case "listAttendance": {
      let records = [...mockAttendance];
      const name = payload.name as string | undefined;
      const from = payload.from as string | undefined;
      const to = payload.to as string | undefined;
      if (name) records = records.filter((r) => r.employeeName === name);
      if (from) records = records.filter((r) => r.date >= from);
      if (to) records = records.filter((r) => r.date <= to);
      records.sort((a, b) => b.date.localeCompare(a.date) || b.timestamp.localeCompare(a.timestamp));
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
      const name = (payload.name as string)?.trim();
      const pin = (payload.pin as string)?.trim();
      const role = (payload.role as Employee["role"]) || "employee";
      if (!name || !pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return { ok: false, error: "Tên và PIN 4 số là bắt buộc" };
      }
      if (mockEmployees.some((e) => e.name === name)) {
        return { ok: false, error: "Nhân viên đã tồn tại" };
      }
      const emp: Employee = { name, pin, role, active: true };
      mockEmployees.push(emp);
      return { ok: true, data: emp as T };
    }
    case "deactivateEmployee": {
      const name = payload.name as string;
      const emp = mockEmployees.find((e) => e.name === name);
      if (!emp) return { ok: false, error: "Không tìm thấy nhân viên" };
      emp.active = false;
      return { ok: true, data: emp as T };
    }
    default:
      return { ok: false, error: `Unknown action: ${action}` };
  }
}

async function postToSheets<T>(
  request: SheetsRequest
): Promise<SheetsResponse<T>> {
  const res = await fetch(WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(request),
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as SheetsResponse<T>;
}

/**
 * Call Google Apps Script Web App (or mock).
 * On network failure for mutating actions, enqueue to localStorage.
 */
export async function callSheets<T = unknown>(
  request: SheetsRequest,
  options?: { queueOnFail?: boolean }
): Promise<SheetsResponse<T>> {
  const queueOnFail = options?.queueOnFail ?? false;

  if (isMockMode()) {
    return mockHandler<T>(request);
  }

  try {
    return await postToSheets<T>(request);
  } catch (err) {
    if (queueOnFail) {
      enqueue(request);
      return {
        ok: false,
        error: "Mất kết nối — đã lưu vào hàng đợi offline",
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Lỗi kết nối",
    };
  }
}

/** Retry all queued offline requests. Returns count of successful retries. */
export async function flushOfflineQueue(): Promise<{
  success: number;
  failed: number;
}> {
  if (isMockMode()) return { success: 0, failed: 0 };

  const queue = getQueue();
  if (queue.length === 0) return { success: 0, failed: 0 };

  const remaining: typeof queue = [];
  let success = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const res = await postToSheets(item.request);
      if (res.ok) {
        success += 1;
      } else {
        remaining.push(item);
        failed += 1;
      }
    } catch {
      remaining.push(item);
      failed += 1;
    }
  }

  setQueue(remaining);
  return { success, failed };
}

export async function listEmployees(): Promise<Employee[]> {
  const res = await callSheets<Employee[]>({ action: "listEmployees" });
  return res.ok && res.data ? res.data : [];
}

export async function listAttendance(filters?: {
  name?: string;
  from?: string;
  to?: string;
}): Promise<AttendanceRecord[]> {
  const res = await callSheets<AttendanceRecord[]>({
    action: "listAttendance",
    payload: filters,
  });
  return res.ok && res.data ? res.data : [];
}

export async function verifyPin(name: string, pin: string) {
  return callSheets<{ name: string; role: "employee" | "admin" }>({
    action: "verifyPin",
    payload: { name, pin },
  });
}

export async function checkIn(name: string, note?: string) {
  return callSheets<AttendanceRecord>(
    { action: "checkIn", payload: { name, note } },
    { queueOnFail: true }
  );
}

export async function checkOut(name: string) {
  return callSheets<AttendanceRecord>(
    { action: "checkOut", payload: { name } },
    { queueOnFail: true }
  );
}

export async function addEmployee(
  name: string,
  pin: string,
  role: "employee" | "admin" = "employee"
) {
  return callSheets<Employee>(
    { action: "addEmployee", payload: { name, pin, role } },
    { queueOnFail: true }
  );
}

export async function deactivateEmployee(name: string) {
  return callSheets<Employee>(
    { action: "deactivateEmployee", payload: { name } },
    { queueOnFail: true }
  );
}
