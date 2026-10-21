/** Cache phía browser — đổi trang không gọi API lại ngay. */

type Entry = { value: unknown; expires: number };

const mem = new Map<string, Entry>();

const EMP_KEY = "employees:all";
const EMP_TTL = 60_000;
const ATT_TTL = 20_000;

function get<T>(key: string): T | undefined {
  const hit = mem.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expires) {
    mem.delete(key);
    return undefined;
  }
  return hit.value as T;
}

function set(key: string, value: unknown, ttlMs: number) {
  mem.set(key, { value, expires: Date.now() + ttlMs });
}

export function clientCacheGetEmployees<T>(): T | undefined {
  return get<T>(EMP_KEY);
}

export function clientCacheSetEmployees(value: unknown) {
  set(EMP_KEY, value, EMP_TTL);
}

export function clientCacheGetAttendance<T>(key: string): T | undefined {
  return get<T>(`att:${key}`);
}

export function clientCacheSetAttendance(key: string, value: unknown) {
  set(`att:${key}`, value, ATT_TTL);
}

export function clientCacheInvalidateEmployees() {
  mem.delete(EMP_KEY);
}

export function clientCacheInvalidateAttendance() {
  Array.from(mem.keys()).forEach((key) => {
    if (key.startsWith("att:")) mem.delete(key);
  });
}

export function clientCacheGetOt<T>(key: string): T | undefined {
  return get<T>(`ot:${key}`);
}

export function clientCacheSetOt(key: string, value: unknown) {
  set(`ot:${key}`, value, ATT_TTL);
}

export function clientCacheInvalidateOt() {
  Array.from(mem.keys()).forEach((key) => {
    if (key.startsWith("ot:")) mem.delete(key);
  });
}

export function clientCacheGetMeals<T>(key: string): T | undefined {
  return get<T>(`meals:${key}`);
}

export function clientCacheSetMeals(key: string, value: unknown) {
  set(`meals:${key}`, value, ATT_TTL);
}

export function clientCacheInvalidateMeals() {
  Array.from(mem.keys()).forEach((key) => {
    if (key.startsWith("meals:")) mem.delete(key);
  });
}

const SETTINGS_KEY = "settings:app";
const SETTINGS_TTL = 60_000;

export function clientCacheGetSettings<T>(): T | undefined {
  return get<T>(SETTINGS_KEY);
}

export function clientCacheSetSettings(value: unknown) {
  set(SETTINGS_KEY, value, SETTINGS_TTL);
}

export function clientCacheInvalidateSettings() {
  mem.delete(SETTINGS_KEY);
}

export function clientCacheInvalidateAll() {
  mem.clear();
}
