import { getDb } from "./mongodb";
import type {
  AttendanceRecord,
  Employee,
  SheetsRequest,
  SheetsResponse,
} from "./types";
import { isValidPin, nowTime, todayISO } from "./utils";

type EmpDoc = Employee & { _id?: unknown };
type AttDoc = AttendanceRecord & { _id?: unknown };

function publicEmployee(emp: EmpDoc) {
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

/** MongoDB Atlas handlers */
export async function mongoHandler<T>(
  request: SheetsRequest
): Promise<SheetsResponse<T>> {
  try {
    const db = await getDb();
    const employees = db.collection<EmpDoc>("employees");
    const attendance = db.collection<AttDoc>("attendance");
    const { action, payload = {} } = request;

    switch (action) {
      case "listEmployees": {
        const count = await employees.countDocuments();
        if (count === 0) {
          await employees.insertOne({
            name: "Admin",
            pin: "999999",
            role: "admin",
            active: true,
            employeeCode: "NV001",
            phone: "",
            cccd: "",
            address: "",
          });
        }
        const rows = await employees.find({}).sort({ employeeCode: 1 }).toArray();
        return { ok: true, data: rows.map(publicEmployee) as T };
      }
      case "listAttendance": {
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
          .toArray();
        const data = rows.map(({ _id, ...rest }) => rest);
        return { ok: true, data: data as T };
      }
      case "verifyPin": {
        const emp = await employees.findOne({
          name: String(payload.name || ""),
          pin: String(payload.pin || ""),
          active: true,
        });
        if (!emp) return { ok: false, error: "Tên hoặc mã PIN không đúng" };
        return {
          ok: true,
          data: { name: emp.name, role: emp.role } as T,
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
        return {
          ok: true,
          data: { ...existing, checkOut, status: "checked_out" } as T,
        };
      }
      case "addEmployee": {
        const name = String(payload.name || "").trim();
        const pin = String(payload.pin || "").trim();
        const role = (payload.role as Employee["role"]) || "employee";
        const employeeCode = String(payload.employeeCode || "").trim();
        const phone = String(payload.phone || "").trim();
        const cccd = String(payload.cccd || "").trim();
        const address = String(payload.address || "").trim();
        if (!name || !employeeCode || !isValidPin(pin)) {
          return { ok: false, error: "Họ tên, mã NV và PIN 4–6 số là bắt buộc" };
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
        };
        await employees.insertOne(emp);
        return { ok: true, data: publicEmployee(emp) as T };
      }
      case "updateEmployee": {
        const originalName = String(payload.originalName || "").trim();
        const name = String(payload.name || "").trim();
        const pinRaw = String(payload.pin ?? "").trim();
        const role = (payload.role as Employee["role"]) || "employee";
        const employeeCode = String(payload.employeeCode || "").trim();
        const phone = String(payload.phone || "").trim();
        const cccd = String(payload.cccd || "").trim();
        const address = String(payload.address || "").trim();
        const active =
          payload.active !== false && String(payload.active) !== "false";
        if (!originalName || !name || !employeeCode) {
          return { ok: false, error: "Họ tên và mã nhân viên là bắt buộc" };
        }
        if (pinRaw && !isValidPin(pinRaw)) {
          return { ok: false, error: "PIN phải gồm 4–6 chữ số" };
        }
        const prev = await employees.findOne({ name: originalName });
        if (!prev) return { ok: false, error: "Không tìm thấy nhân viên" };
        if (name !== originalName && (await employees.findOne({ name }))) {
          return { ok: false, error: "Họ tên đã tồn tại" };
        }
        const codeClash = await employees.findOne({
          employeeCode,
          name: { $ne: originalName },
        });
        if (codeClash) return { ok: false, error: "Mã nhân viên đã tồn tại" };

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
        await employees.updateOne({ name: originalName }, { $set: emp });
        if (name !== originalName) {
          await attendance.updateMany(
            { employeeName: originalName },
            { $set: { employeeName: name } }
          );
        }
        return { ok: true, data: publicEmployee(emp) as T };
      }
      case "deleteEmployee": {
        const name = String(payload.name || "").trim();
        const res = await employees.deleteOne({ name });
        if (res.deletedCount === 0) {
          return { ok: false, error: "Không tìm thấy nhân viên" };
        }
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
        return { ok: true, data: publicEmployee(res) as T };
      }
      default:
        return { ok: false, error: `Unknown action: ${action}` };
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Lỗi MongoDB",
    };
  }
}
