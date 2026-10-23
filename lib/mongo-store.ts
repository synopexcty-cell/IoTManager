import {
  DEFAULT_COLUMN_COLORS,
  normalizeColumnColors,
  normalizeMonthColors,
} from "./column-colors";
import { cacheGet, cacheInvalidate, cacheSet } from "./server-cache";
import { getDb } from "./mongodb";
import { parseMealRecord } from "./meal";
import { parseOtValue } from "./ot";
import type {
  AppSettings,
  AttendanceRecord,
  Employee,
  MealRecord,
  OtRecord,
  SheetsRequest,
  SheetsResponse,
} from "./types";
import {
  isValidPin,
  normalizeEmployeeCode,
  normalizeTime,
  nowTime,
  parseBirthDate,
  parseGender,
  todayISO,
} from "./utils";

const SETTINGS_ID = "app";
const SETTINGS_CACHE = "settings:app";
const SETTINGS_TTL = 60_000;

type SettingsDoc = {
  _id: string;
  columnColors?: unknown;
  monthColors?: unknown;
};

const EMP_TTL = 30_000;
const ATT_TTL = 15_000;

type EmpDoc = Employee & { _id?: unknown };
type AttDoc = AttendanceRecord & { _id?: unknown };
type OtDoc = OtRecord & { _id?: unknown };
type MealDoc = MealRecord & { _id?: unknown };

function publicEmployee(emp: EmpDoc) {
  return {
    name: emp.name,
    role: emp.role,
    active: emp.active,
    employeeCode: emp.employeeCode || "",
    phone: emp.phone || "",
    cccd: emp.cccd || "",
    address: emp.address || "",
    gender: emp.gender || "",
    birthDate: emp.birthDate || "",
    team: emp.team || "",
    shift: emp.shift || "",
  };
}

/** MongoDB Atlas handlers */
export async function mongoHandler<T>(
  request: SheetsRequest
): Promise<SheetsResponse<T>> {
  try {
    const db = await getDb();
    const employees = db.collection<EmpDoc>("employees");
    const attendance = db.collection<AttDoc>("attendance");
    const overtime = db.collection<OtDoc>("overtime");
    const meals = db.collection<MealDoc>("meals");
    const settings = db.collection<SettingsDoc>("settings");
    const { action, payload = {} } = request;

    switch (action) {
      case "listEmployees": {
        const cached = cacheGet<ReturnType<typeof publicEmployee>[]>(
          "employees:all"
        );
        if (cached) return { ok: true, data: cached as T };

        let rows = await employees
          .find({})
          .sort({ employeeCode: 1 })
          .toArray();
        if (rows.length === 0) {
          const seed: Employee = {
            name: "Admin",
            pin: "999999",
            role: "admin",
            active: true,
            employeeCode: "NV001",
            phone: "",
            cccd: "",
            address: "",
            mustChangePassword: true,
          };
          await employees.insertOne(seed);
          rows = await employees
            .find({})
            .sort({ employeeCode: 1 })
            .toArray();
        }
        const data = rows.map(publicEmployee);
        cacheSet("employees:all", data, EMP_TTL);
        return { ok: true, data: data as T };
      }
      case "listAttendance": {
        const nameKey = payload.name ? String(payload.name) : "";
        const fromKey = payload.from ? String(payload.from) : "";
        const toKey = payload.to ? String(payload.to) : "";
        const cacheKey = `attendance:${nameKey}:${fromKey}:${toKey}`;
        const cached = cacheGet<AttendanceRecord[]>(cacheKey);
        if (cached) return { ok: true, data: cached as T };

        const filter: {
          employeeName?: string;
          date?: { $gte?: string; $lte?: string };
        } = {};
        if (payload.name) filter.employeeName = String(payload.name);
        if (payload.from || payload.to) {
          filter.date = {};
          if (payload.from) filter.date.$gte = String(payload.from);
          if (payload.to) filter.date.$lte = String(payload.to);
        }
        const rows = await attendance
          .find(filter)
          .sort({ date: -1, timestamp: -1 })
          .limit(500)
          .toArray();
        const data = rows.map(({ _id, ...rest }) => rest) as AttendanceRecord[];
        cacheSet(cacheKey, data, ATT_TTL);
        return { ok: true, data: data as T };
      }
      case "verifyPin": {
        const code = normalizeEmployeeCode(
          String(payload.employeeCode || payload.code || payload.name || "")
        );
        const pin = String(payload.pin || "");
        const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const emp = await employees.findOne({
          employeeCode: { $regex: `^${escaped}$`, $options: "i" },
          pin,
          active: true,
        });
        if (!emp) {
          return { ok: false, error: "Mã nhân viên hoặc mật khẩu không đúng" };
        }
        return {
          ok: true,
          data: {
            name: emp.name,
            role: emp.role,
            employeeCode: emp.employeeCode,
            mustChangePassword: emp.mustChangePassword !== false,
          } as T,
        };
      }
      case "changePassword": {
        const code = normalizeEmployeeCode(String(payload.employeeCode || ""));
        const currentPin = String(payload.currentPin || "");
        const newPin = String(payload.newPin || "").trim();
        if (!code) return { ok: false, error: "Thiếu mã nhân viên" };
        if (!isValidPin(newPin)) {
          return { ok: false, error: "Mật khẩu mới phải gồm 4–8 chữ số" };
        }
        if (newPin === currentPin) {
          return { ok: false, error: "Mật khẩu mới phải khác mật khẩu cũ" };
        }
        const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const emp = await employees.findOne({
          employeeCode: { $regex: `^${escaped}$`, $options: "i" },
          pin: currentPin,
          active: true,
        });
        if (!emp) {
          return { ok: false, error: "Mật khẩu hiện tại không đúng" };
        }
        await employees.updateOne(
          { _id: emp._id },
          { $set: { pin: newPin, mustChangePassword: false } }
        );
        cacheInvalidate("employees:");
        return {
          ok: true,
          data: {
            name: emp.name,
            role: emp.role,
            employeeCode: emp.employeeCode,
            mustChangePassword: false,
          } as T,
        };
      }
      case "checkIn": {
        const name = String(payload.name);
        const date = todayISO();
        const existing = await attendance.findOne({ employeeName: name, date });
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
          note: String(payload.note || ""),
        };
        if (existing) {
          await attendance.updateOne(
            { employeeName: name, date },
            { $set: record }
          );
        } else {
          await attendance.insertOne(record);
        }
        cacheInvalidate("attendance:");
        return { ok: true, data: record as T };
      }
      case "checkOut": {
        const name = String(payload.name);
        const date = todayISO();
        const existing = await attendance.findOne({ employeeName: name, date });
        if (!existing?.checkIn) {
          return { ok: false, error: "Bạn chưa check-in hôm nay" };
        }
        if (existing.checkOut) {
          return { ok: false, error: "Bạn đã check-out hôm nay" };
        }
        const checkOut = nowTime();
        await attendance.updateOne(
          { employeeName: name, date },
          { $set: { checkOut, status: "checked_out" } }
        );
        cacheInvalidate("attendance:");
        return {
          ok: true,
          data: { ...existing, checkOut, status: "checked_out" } as T,
        };
      }
      case "saveAttendance": {
        const name = String(payload.name || "").trim();
        const date = String(payload.date || todayISO()).trim();
        const checkIn = normalizeTime(payload.checkIn);
        const checkOut = normalizeTime(payload.checkOut);
        const note = String(payload.note || "").trim();
        if (!name) return { ok: false, error: "Thiếu tên nhân viên" };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayISO()) {
          return { ok: false, error: "Ngày không hợp lệ (không được sau hôm nay)" };
        }
        if (!checkIn) {
          return { ok: false, error: "Cần giờ vào (HH:mm)" };
        }
        const emp = await employees.findOne({ name, active: true });
        if (!emp) return { ok: false, error: "Không tìm thấy nhân viên" };
        const record: AttendanceRecord = {
          timestamp: new Date().toISOString(),
          employeeName: name,
          date,
          checkIn,
          checkOut,
          status: checkOut ? "checked_out" : "checked_in",
          note,
        };
        await attendance.updateOne(
          { employeeName: name, date },
          { $set: record },
          { upsert: true }
        );
        cacheInvalidate("attendance:");
        return { ok: true, data: record as T };
      }
      case "addEmployee": {
        const name = String(payload.name || "").trim();
        const pin = String(payload.pin || "").trim();
        const role = (payload.role as Employee["role"]) || "employee";
        const employeeCode = normalizeEmployeeCode(
          String(payload.employeeCode || "")
        );
        const phone = String(payload.phone || "").trim();
        const cccd = String(payload.cccd || "").trim();
        const address = String(payload.address || "").trim();
        const gender = parseGender(payload.gender);
        const birthDate = parseBirthDate(payload.birthDate);
        const team = String(payload.team || "").trim();
        const shift = String(payload.shift || "").trim();
        if (!name || !employeeCode || !isValidPin(pin)) {
          return { ok: false, error: "Họ tên, mã NV và mật khẩu 4–8 số là bắt buộc" };
        }
        if (await employees.findOne({ name })) {
          return { ok: false, error: "Họ tên đã tồn tại" };
        }
        if (await employees.findOne({ employeeCode })) {
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
          gender,
          birthDate,
          team,
          shift,
          mustChangePassword: true,
        };
        await employees.insertOne(emp);
        cacheInvalidate("employees:");
        return { ok: true, data: publicEmployee(emp) as T };
      }
      case "importEmployees": {
        const list = Array.isArray(payload.employees)
          ? (payload.employees as Record<string, unknown>[])
          : [];
        if (list.length === 0) {
          return { ok: false, error: "File không có dòng nhân viên" };
        }
        if (list.length > 500) {
          return { ok: false, error: "Tối đa 500 dòng mỗi lần import" };
        }
        const existing = await employees.find({}).toArray();
        const names = new Set(existing.map((e) => e.name));
        const codes = new Set(existing.map((e) => e.employeeCode));
        const toInsert: Employee[] = [];
        const errors: { row: number; message: string }[] = [];
        let skipped = 0;

        list.forEach((raw, i) => {
          const rowNo = i + 2;
          const name = String(raw.name || "").trim();
          const pin = String(raw.pin || "").trim();
          const employeeCode = normalizeEmployeeCode(
            String(raw.employeeCode || "")
          );
          const role = (raw.role as Employee["role"]) || "employee";
          if (!name || !employeeCode) {
            errors.push({ row: rowNo, message: "Thiếu họ tên hoặc mã NV" });
            skipped += 1;
            return;
          }
          if (!isValidPin(pin)) {
            errors.push({ row: rowNo, message: `${name}: PIN không hợp lệ` });
            skipped += 1;
            return;
          }
          if (names.has(name) || codes.has(employeeCode)) {
            errors.push({
              row: rowNo,
              message: `${name} / ${employeeCode}: đã tồn tại`,
            });
            skipped += 1;
            return;
          }
          names.add(name);
          codes.add(employeeCode);
          toInsert.push({
            name,
            pin,
            role: role === "admin" ? "admin" : "employee",
            active: true,
            employeeCode,
            phone: String(raw.phone || "").trim(),
            cccd: String(raw.cccd || "").trim(),
            address: String(raw.address || "").trim(),
            gender: parseGender(raw.gender),
            birthDate: parseBirthDate(raw.birthDate),
            team: String(raw.team || "").trim(),
            shift: String(raw.shift || "").trim(),
            mustChangePassword: true,
          });
        });

        if (toInsert.length > 0) {
          await employees.insertMany(toInsert);
          cacheInvalidate("employees:");
        }
        return {
          ok: true,
          data: {
            inserted: toInsert.length,
            skipped,
            errors,
          } as T,
        };
      }
      case "updateEmployee": {
        const originalName = String(payload.originalName || "").trim();
        const name = String(payload.name || "").trim();
        const pinRaw = String(payload.pin ?? "").trim();
        const role = (payload.role as Employee["role"]) || "employee";
        const employeeCode = normalizeEmployeeCode(
          String(payload.employeeCode || "")
        );
        const phone = String(payload.phone || "").trim();
        const cccd = String(payload.cccd || "").trim();
        const address = String(payload.address || "").trim();
        const active =
          payload.active !== false && String(payload.active) !== "false";
        if (!originalName || !name || !employeeCode) {
          return { ok: false, error: "Họ tên và mã nhân viên là bắt buộc" };
        }
        if (pinRaw && !isValidPin(pinRaw)) {
          return { ok: false, error: "Mật khẩu phải gồm 4–8 chữ số" };
        }
        const prev = await employees.findOne({ name: originalName });
        if (!prev) return { ok: false, error: "Không tìm thấy nhân viên" };
        const gender = parseGender(payload.gender ?? prev.gender);
        const birthDate = parseBirthDate(payload.birthDate ?? prev.birthDate);
        if (name !== originalName && (await employees.findOne({ name }))) {
          return { ok: false, error: "Họ tên đã tồn tại" };
        }
        const codeClash = await employees.findOne({
          employeeCode,
          name: { $ne: originalName },
        });
        if (codeClash) return { ok: false, error: "Mã nhân viên đã tồn tại" };

        const team = String(payload.team ?? prev.team ?? "").trim();
        const shift = String(payload.shift ?? prev.shift ?? "").trim();
        const emp: Employee = {
          name,
          pin: pinRaw || prev.pin || "",
          role,
          active: Boolean(active),
          employeeCode,
          phone,
          cccd,
          address,
          gender,
          birthDate,
          team,
          shift,
          ...(pinRaw ? { mustChangePassword: true } : {}),
        };
        await employees.updateOne({ name: originalName }, { $set: emp });
        if (name !== originalName) {
          await attendance.updateMany(
            { employeeName: originalName },
            { $set: { employeeName: name } }
          );
          cacheInvalidate("attendance:");
        }
        cacheInvalidate("employees:");
        return { ok: true, data: publicEmployee(emp) as T };
      }
      case "deleteEmployee": {
        const name = String(payload.name || "").trim();
        const res = await employees.deleteOne({ name });
        if (res.deletedCount === 0) {
          return { ok: false, error: "Không tìm thấy nhân viên" };
        }
        cacheInvalidate("employees:");
        return { ok: true, data: { name } as T };
      }
      case "deactivateEmployee": {
        const name = String(payload.name);
        const res = await employees.findOneAndUpdate(
          { name },
          { $set: { active: false } },
          { returnDocument: "after" }
        );
        if (!res) return { ok: false, error: "Không tìm thấy nhân viên" };
        cacheInvalidate("employees:");
        return { ok: true, data: publicEmployee(res) as T };
      }
      case "listOt": {
        const nameKey = payload.name ? String(payload.name) : "";
        const fromKey = payload.from ? String(payload.from) : "";
        const toKey = payload.to ? String(payload.to) : "";
        const cacheKey = `ot:${nameKey}:${fromKey}:${toKey}`;
        const cached = cacheGet<OtRecord[]>(cacheKey);
        if (cached) return { ok: true, data: cached as T };

        const filter: {
          employeeName?: string;
          date?: { $gte?: string; $lte?: string };
        } = {};
        if (payload.name) filter.employeeName = String(payload.name);
        if (payload.from || payload.to) {
          filter.date = {};
          if (payload.from) filter.date.$gte = String(payload.from);
          if (payload.to) filter.date.$lte = String(payload.to);
        }
        const rows = await overtime
          .find(filter)
          .sort({ date: 1, employeeName: 1 })
          .limit(2000)
          .toArray();
        const data = rows.map(({ _id, ...rest }) => rest) as OtRecord[];
        cacheSet(cacheKey, data, ATT_TTL);
        return { ok: true, data: data as T };
      }
      case "saveOt": {
        const name = String(payload.name || payload.employeeName || "").trim();
        const date = String(payload.date || "").trim();
        const value = parseOtValue(payload.value);
        if (!name) return { ok: false, error: "Thiếu tên nhân viên" };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return { ok: false, error: "Ngày không hợp lệ" };
        }
        if (value == null) {
          return { ok: false, error: "Giờ OT không hợp lệ (0–24, P hoặc /)" };
        }
        const emp = await employees.findOne({ name, active: true });
        if (!emp) return { ok: false, error: "Không tìm thấy nhân viên" };

        if (!value) {
          await overtime.deleteOne({ employeeName: name, date });
          cacheInvalidate("ot:");
          return { ok: true, data: { employeeName: name, date, value: "" } as T };
        }

        const record: OtRecord = {
          employeeName: name,
          date,
          value,
          updatedAt: new Date().toISOString(),
        };
        await overtime.updateOne(
          { employeeName: name, date },
          { $set: record },
          { upsert: true }
        );
        cacheInvalidate("ot:");
        return { ok: true, data: record as T };
      }
      case "listMeals": {
        const nameKey = payload.name ? String(payload.name) : "";
        const fromKey = payload.from ? String(payload.from) : "";
        const toKey = payload.to ? String(payload.to) : "";
        const cacheKey = `meals:${nameKey}:${fromKey}:${toKey}`;
        const cached = cacheGet<MealRecord[]>(cacheKey);
        if (cached) return { ok: true, data: cached as T };

        const filter: {
          employeeName?: string;
          date?: { $gte?: string; $lte?: string };
        } = {};
        if (payload.name) filter.employeeName = String(payload.name);
        if (payload.from || payload.to) {
          filter.date = {};
          if (payload.from) filter.date.$gte = String(payload.from);
          if (payload.to) filter.date.$lte = String(payload.to);
        }
        const rows = await meals
          .find(filter)
          .sort({ date: 1, employeeName: 1 })
          .limit(2000)
          .toArray();
        const data = rows.map(({ _id, ...rest }) => rest) as MealRecord[];
        cacheSet(cacheKey, data, ATT_TTL);
        return { ok: true, data: data as T };
      }
      case "saveMeal": {
        const name = String(payload.name || payload.employeeName || "").trim();
        const date = String(payload.date || "").trim();
        const { lunch, dinner } = parseMealRecord(payload);
        if (!name) return { ok: false, error: "Thiếu tên nhân viên" };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return { ok: false, error: "Ngày không hợp lệ" };
        }
        const emp = await employees.findOne({ name, active: true });
        if (!emp) return { ok: false, error: "Không tìm thấy nhân viên" };

        if (!lunch && !dinner) {
          await meals.deleteOne({ employeeName: name, date });
          cacheInvalidate("meals:");
          return {
            ok: true,
            data: { employeeName: name, date, lunch: false, dinner: false } as T,
          };
        }

        const record: MealRecord = {
          employeeName: name,
          date,
          lunch,
          dinner,
          updatedAt: new Date().toISOString(),
        };
        await meals.updateOne(
          { employeeName: name, date },
          { $set: record },
          { upsert: true }
        );
        cacheInvalidate("meals:");
        return { ok: true, data: record as T };
      }
      case "getSettings": {
        const cached = cacheGet<AppSettings>(SETTINGS_CACHE);
        if (cached) return { ok: true, data: cached as T };
        const doc = await settings.findOne({ _id: SETTINGS_ID });
        const data: AppSettings = {
          columnColors: doc
            ? normalizeColumnColors(doc.columnColors)
            : DEFAULT_COLUMN_COLORS,
          monthColors: normalizeMonthColors(doc?.monthColors),
        };
        cacheSet(SETTINGS_CACHE, data, SETTINGS_TTL);
        return { ok: true, data: data as T };
      }
      case "updateSettings": {
        const doc = await settings.findOne({ _id: SETTINGS_ID });
        let columnColors = doc
          ? normalizeColumnColors(doc.columnColors)
          : DEFAULT_COLUMN_COLORS;
        const monthColors = normalizeMonthColors(doc?.monthColors);
        const monthKey = String(payload.monthKey || "").trim();
        if (monthKey) {
          if (!/^\d{4}-\d{2}$/.test(monthKey)) {
            return { ok: false, error: "Tháng không hợp lệ" };
          }
          monthColors[monthKey] = normalizeColumnColors(payload.columnColors);
        } else if (payload.columnColors) {
          columnColors = normalizeColumnColors(payload.columnColors);
        }
        await settings.updateOne(
          { _id: SETTINGS_ID },
          { $set: { columnColors, monthColors } },
          { upsert: true }
        );
        const data: AppSettings = { columnColors, monthColors };
        cacheInvalidate(SETTINGS_CACHE);
        cacheSet(SETTINGS_CACHE, data, SETTINGS_TTL);
        return { ok: true, data: data as T };
      }
      default:
        return { ok: false, error: `Unknown action: ${action}` };
    }
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      error: "Không kết nối được máy chủ",
    };
  }
}
