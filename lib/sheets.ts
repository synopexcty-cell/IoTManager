import {
  clearStoredToken,
  clearStoredUser,
  getStoredToken,
  setStoredToken,
} from "./auth";
import {
  clientCacheGetAttendance,
  clientCacheGetEmployees,
  clientCacheGetMeals,
  clientCacheGetOt,
  clientCacheGetSettings,
  clientCacheInvalidateAll,
  clientCacheInvalidateAttendance,
  clientCacheInvalidateEmployees,
  clientCacheInvalidateMeals,
  clientCacheInvalidateOt,
  clientCacheInvalidateSettings,
  clientCacheSetAttendance,
  clientCacheSetEmployees,
  clientCacheSetMeals,
  clientCacheSetOt,
  clientCacheSetSettings,
} from "./client-cache";
import { DEFAULT_COLUMN_COLORS } from "./column-colors";
import { normalizeOtWindow } from "./ot-window";
import { enqueue, getQueue, setQueue } from "./offline-queue";
import type {
  AppSettings,
  AttendanceRecord,
  Employee,
  LoginRosterItem,
  MealRecord,
  OtRecord,
  SheetsRequest,
  SheetsResponse,
} from "./types";

async function postToApi<T>(
  request: SheetsRequest
): Promise<SheetsResponse<T>> {
  const token = getStoredToken();
  const res = await fetch("/api/sheets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
  });
  const data = (await res.json().catch(() => null)) as SheetsResponse<T> | null;
  if (res.status === 401) {
    clearStoredToken();
    clearStoredUser();
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.includes("/login")
    ) {
      window.location.replace("/login");
    }
    return { ok: false, error: data?.error || "Cần đăng nhập" };
  }
  if (!res.ok) {
    return {
      ok: false,
      error: data?.error || `HTTP ${res.status}`,
    };
  }
  if (
    data?.ok &&
    data.data &&
    typeof data.data === "object" &&
    "token" in (data.data as object)
  ) {
    const tokenValue = (data.data as { token?: string }).token;
    if (tokenValue) setStoredToken(tokenValue);
  }
  return data as SheetsResponse<T>;
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
  if (success > 0) clientCacheInvalidateAll();
  return { success, failed };
}

export async function listLoginRoster(): Promise<LoginRosterItem[]> {
  const res = await callSheets<LoginRosterItem[]>({ action: "listLoginRoster" });
  return res.ok && res.data ? res.data : [];
}

export async function listEmployees(options?: {
  force?: boolean;
}): Promise<Employee[]> {
  if (!options?.force) {
    const cached = clientCacheGetEmployees<Employee[]>();
    if (cached) return cached;
  }
  const res = await callSheets<Employee[]>({ action: "listEmployees" });
  if (!res.ok) {
    throw new Error(res.error || "Không tải được danh sách nhân viên");
  }
  const data = res.data || [];
  clientCacheSetEmployees(data);
  return data;
}

export async function listAttendance(
  filters?: {
    name?: string;
    from?: string;
    to?: string;
  },
  options?: { force?: boolean }
): Promise<AttendanceRecord[]> {
  const key = `${filters?.name || ""}|${filters?.from || ""}|${filters?.to || ""}`;
  if (!options?.force) {
    const cached = clientCacheGetAttendance<AttendanceRecord[]>(key);
    if (cached) return cached;
  }
  const res = await callSheets<AttendanceRecord[]>({
    action: "listAttendance",
    payload: filters,
  });
  const data = res.ok && res.data ? res.data : [];
  if (res.ok) clientCacheSetAttendance(key, data);
  return data;
}

export async function verifyPin(employeeCode: string, pin: string) {
  return callSheets<{
    name: string;
    role: "employee" | "admin";
    employeeCode: string;
    mustChangePassword: boolean;
    token: string;
  }>({
    action: "verifyPin",
    payload: { employeeCode, pin },
  });
}

export async function changePassword(
  employeeCode: string,
  currentPin: string,
  newPin: string
) {
  return callSheets<{
    name: string;
    role: "employee" | "admin";
    employeeCode: string;
    mustChangePassword: boolean;
    token: string;
  }>({
    action: "changePassword",
    payload: { employeeCode, currentPin, newPin },
  });
}

export async function checkIn(name: string, note?: string) {
  const res = await callSheets<AttendanceRecord>(
    { action: "checkIn", payload: { name, note } },
    { queueOnFail: true }
  );
  if (res.ok) clientCacheInvalidateAttendance();
  return res;
}

export async function checkOut(name: string) {
  const res = await callSheets<AttendanceRecord>(
    { action: "checkOut", payload: { name } },
    { queueOnFail: true }
  );
  if (res.ok) clientCacheInvalidateAttendance();
  return res;
}

export async function listOt(
  filters?: {
    name?: string;
    from?: string;
    to?: string;
  },
  options?: { force?: boolean }
): Promise<OtRecord[]> {
  const key = `${filters?.name || ""}|${filters?.from || ""}|${filters?.to || ""}`;
  if (!options?.force) {
    const cached = clientCacheGetOt<OtRecord[]>(key);
    if (cached) return cached;
  }
  const res = await callSheets<OtRecord[]>({
    action: "listOt",
    payload: filters,
  });
  const data = res.ok && res.data ? res.data : [];
  if (res.ok) clientCacheSetOt(key, data);
  return data;
}

export async function saveOt(payload: {
  name: string;
  date: string;
  value: string;
}) {
  const res = await callSheets<OtRecord>(
    { action: "saveOt", payload },
    { queueOnFail: true }
  );
  if (res.ok) clientCacheInvalidateOt();
  return res;
}

export async function listMeals(
  filters?: {
    name?: string;
    from?: string;
    to?: string;
  },
  options?: { force?: boolean }
): Promise<MealRecord[]> {
  const key = `${filters?.name || ""}|${filters?.from || ""}|${filters?.to || ""}`;
  if (!options?.force) {
    const cached = clientCacheGetMeals<MealRecord[]>(key);
    if (cached) return cached;
  }
  const res = await callSheets<MealRecord[]>({
    action: "listMeals",
    payload: filters,
  });
  const data = res.ok && res.data ? res.data : [];
  if (res.ok) clientCacheSetMeals(key, data);
  return data;
}

export async function saveMeal(payload: {
  name: string;
  date: string;
  lunch: boolean;
  dinner: boolean;
}) {
  const res = await callSheets<MealRecord>(
    { action: "saveMeal", payload },
    { queueOnFail: true }
  );
  if (res.ok) clientCacheInvalidateMeals();
  return res;
}

export async function saveAttendance(payload: {
  name: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  note?: string;
}) {
  const res = await callSheets<AttendanceRecord>(
    { action: "saveAttendance", payload },
    { queueOnFail: true }
  );
  if (res.ok) clientCacheInvalidateAttendance();
  return res;
}

export async function addEmployee(payload: {
  name: string;
  pin: string;
  role?: "employee" | "admin";
  employeeCode: string;
  phone?: string;
  cccd?: string;
  address?: string;
  gender?: string;
  birthDate?: string;
  team?: string;
  shift?: string;
}) {
  const res = await callSheets<Employee>(
    {
      action: "addEmployee",
      payload: {
        role: "employee",
        phone: "",
        cccd: "",
        address: "",
        gender: "",
        birthDate: "",
        team: "",
        shift: "",
        ...payload,
      },
    },
    { queueOnFail: true }
  );
  if (res.ok) clientCacheInvalidateEmployees();
  return res;
}

export async function importEmployees(
  rows: Array<{
    name: string;
    pin: string;
    role?: "employee" | "admin";
    employeeCode: string;
    phone?: string;
    cccd?: string;
    address?: string;
    gender?: string;
    birthDate?: string;
    team?: string;
    shift?: string;
  }>
) {
  const res = await callSheets<{
    inserted: number;
    skipped: number;
    errors: { row: number; message: string }[];
  }>({
    action: "importEmployees",
    payload: { employees: rows },
  });
  if (res.ok) clientCacheInvalidateEmployees();
  return res;
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
  gender?: string;
  birthDate?: string;
}) {
  const res = await callSheets<Employee>(
    { action: "updateEmployee", payload },
    { queueOnFail: true }
  );
  if (res.ok) {
    clientCacheInvalidateEmployees();
    clientCacheInvalidateAttendance();
  }
  return res;
}

export async function deleteEmployee(name: string) {
  const res = await callSheets<{ name: string }>(
    { action: "deleteEmployee", payload: { name } },
    { queueOnFail: true }
  );
  if (res.ok) clientCacheInvalidateEmployees();
  return res;
}

export async function deactivateEmployee(name: string) {
  const res = await callSheets<Employee>(
    { action: "deactivateEmployee", payload: { name } },
    { queueOnFail: true }
  );
  if (res.ok) clientCacheInvalidateEmployees();
  return res;
}

export async function getSettings(options?: {
  force?: boolean;
}): Promise<AppSettings> {
  if (!options?.force) {
    const cached = clientCacheGetSettings<AppSettings>();
    if (cached) return cached;
  }
  const res = await callSheets<AppSettings>({ action: "getSettings" });
  const data: AppSettings =
    res.ok && res.data
      ? {
          columnColors: res.data.columnColors || DEFAULT_COLUMN_COLORS,
          monthColors: res.data.monthColors || {},
          otWindow: normalizeOtWindow(res.data.otWindow),
        }
      : { columnColors: DEFAULT_COLUMN_COLORS, monthColors: {}, otWindow: null };
  if (res.ok) clientCacheSetSettings(data);
  return data;
}

export async function updateSettings(payload: {
  columnColors?: AppSettings["columnColors"];
  monthKey?: string;
  otWindow?: AppSettings["otWindow"];
}) {
  const res = await callSheets<AppSettings>({
    action: "updateSettings",
    payload,
  });
  if (res.ok && res.data) {
    clientCacheSetSettings(res.data);
  } else {
    clientCacheInvalidateSettings();
  }
  return res;
}
