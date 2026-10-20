import { enqueue, getQueue, setQueue } from "./offline-queue";
import type {
  AttendanceRecord,
  Employee,
  SheetsRequest,
  SheetsResponse,
} from "./types";

/** Client → /api/sheets (MongoDB trên server). */
async function postToApi<T>(
  request: SheetsRequest
): Promise<SheetsResponse<T>> {
  const res = await fetch("/api/sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as SheetsResponse<T>;
}

export async function callSheets<T = unknown>(
  request: SheetsRequest,
  options?: { queueOnFail?: boolean }
): Promise<SheetsResponse<T>> {
  const queueOnFail = options?.queueOnFail ?? false;

  try {
    return await postToApi<T>(request);
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

export async function flushOfflineQueue(): Promise<{
  success: number;
  failed: number;
}> {
  const queue = getQueue();
  if (queue.length === 0) return { success: 0, failed: 0 };

  const remaining: typeof queue = [];
  let success = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const res = await postToApi(item.request);
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

export async function addEmployee(payload: {
  name: string;
  pin: string;
  role?: "employee" | "admin";
  employeeCode: string;
  phone?: string;
  cccd?: string;
  address?: string;
}) {
  return callSheets<Employee>(
    {
      action: "addEmployee",
      payload: {
        role: "employee",
        phone: "",
        cccd: "",
        address: "",
        ...payload,
      },
    },
    { queueOnFail: true }
  );
}

export async function updateEmployee(payload: {
  originalName: string;
  name: string;
  pin?: string;
  role: "employee" | "admin";
  active: boolean;
  employeeCode: string;
  phone?: string;
  cccd?: string;
  address?: string;
}) {
  return callSheets<Employee>(
    { action: "updateEmployee", payload },
    { queueOnFail: true }
  );
}

export async function deleteEmployee(name: string) {
  return callSheets<{ name: string }>(
    { action: "deleteEmployee", payload: { name } },
    { queueOnFail: true }
  );
}

export async function deactivateEmployee(name: string) {
  return callSheets<Employee>(
    { action: "deactivateEmployee", payload: { name } },
    { queueOnFail: true }
  );
}
