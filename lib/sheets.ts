import { enqueue, getQueue, setQueue } from "./offline-queue";
import type {
  AttendanceRecord,
  Employee,
  SheetsRequest,
  SheetsResponse,
} from "./types";

let mockCache: boolean | null = null;
let backendCache: "mongo" | "sheets" | "mock" | null = null;

/** Client calls /api/sheets — URL & secret stay on server. */
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

async function fetchStatus() {
  const res = await fetch("/api/sheets");
  const data = (await res.json()) as {
    mock?: boolean;
    backend?: "mongo" | "sheets" | "mock";
  };
  mockCache = !!data.mock;
  backendCache = data.backend || (data.mock ? "mock" : "sheets");
  return { mock: mockCache, backend: backendCache };
}

/** true = chưa cấu hình Mongo/Sheets (demo). */
export async function fetchIsMockMode(): Promise<boolean> {
  if (mockCache !== null) return mockCache;
  try {
    const s = await fetchStatus();
    return s.mock;
  } catch {
    mockCache = true;
    return true;
  }
}

export async function fetchDataBackend(): Promise<"mongo" | "sheets" | "mock"> {
  if (backendCache) return backendCache;
  try {
    const s = await fetchStatus();
    return s.backend;
  } catch {
    return "mock";
  }
}

/**
 * Call Sheets via Next.js API (or mock on server).
 * On network failure for mutating actions, enqueue to localStorage.
 */
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

/** Retry all queued offline requests. Returns count of successful retries. */
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
