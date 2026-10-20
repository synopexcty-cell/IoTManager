/**
 * ChamCong — Google Apps Script Web App
 *
 * Sheet "Attendance": Timestamp | EmployeeName | Date | CheckIn | CheckOut | Status | Note
 * Sheet "Employees":  Name | PIN | Role | Active | EmployeeCode | Phone | CCCD | Address
 *
 * Deploy: Deploy → New deployment → Web app
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Bảo mật:
 * 1. Đặt Script Property API_SECRET (Project Settings → Script properties)
 *    trùng với SHEETS_API_SECRET trên Vercel / .env.local
 * 2. listEmployees / add / deactivate KHÔNG trả PIN về client
 * 3. Next.js gọi qua /api/sheets (URL + secret không lộ browser)
 */

var ATTENDANCE_SHEET = "Attendance";
var EMPLOYEES_SHEET = "Employees";

function getSecret_() {
  var fromProps = PropertiesService.getScriptProperties().getProperty("API_SECRET");
  if (fromProps) return String(fromProps);
  // Fallback tạm khi chưa set Script Property — ĐỔI NGAY khi deploy
  return "CHANGE_ME_SET_SCRIPT_PROPERTY";
}

function doGet() {
  return json_({ ok: true, data: { service: "ChamCong", version: 2 } });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (!body.secret || body.secret !== getSecret_()) {
      return json_({ ok: false, error: "Unauthorized" });
    }

    var action = body.action;
    var payload = body.payload || {};
    var result;

    switch (action) {
      case "listEmployees":
        result = listEmployees_();
        break;
      case "listAttendance":
        result = listAttendance_(payload);
        break;
      case "verifyPin":
        result = verifyPin_(payload);
        break;
      case "checkIn":
        result = checkIn_(payload);
        break;
      case "checkOut":
        result = checkOut_(payload);
        break;
      case "addEmployee":
        result = addEmployee_(payload);
        break;
      case "updateEmployee":
        result = updateEmployee_(payload);
        break;
      case "deleteEmployee":
        result = deleteEmployee_(payload);
        break;
      case "deactivateEmployee":
        result = deactivateEmployee_(payload);
        break;
      default:
        return json_({ ok: false, error: "Unknown action: " + action });
    }

    return json_(result);
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw new Error("Missing sheet: " + name);
  return sh;
}

function today_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function nowTime_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm");
}

function publicEmp_(row) {
  return {
    name: row.name,
    role: row.role,
    active: row.active,
    employeeCode: row.employeeCode || "",
    phone: row.phone || "",
    cccd: row.cccd || "",
    address: row.address || "",
  };
}

/** Public list — không kèm PIN */
function listEmployees_() {
  var rows = readEmployeesRaw_();
  var data = [];
  for (var i = 0; i < rows.length; i++) {
    data.push(publicEmp_(rows[i]));
  }
  return { ok: true, data: data };
}

function readEmployeesRaw_() {
  var sh = sheet_(EMPLOYEES_SHEET);
  var values = sh.getDataRange().getValues();
  var data = [];
  if (values.length < 2) return data;
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (!row[0]) continue;
    data.push({
      name: String(row[0]),
      pin: String(row[1]),
      role: String(row[2] || "employee"),
      active: String(row[3]).toLowerCase() === "true" || row[3] === true,
      employeeCode: row.length > 4 ? String(row[4] || "") : "",
      phone: row.length > 5 ? String(row[5] || "") : "",
      cccd: row.length > 6 ? String(row[6] || "") : "",
      address: row.length > 7 ? String(row[7] || "") : "",
    });
  }
  return data;
}

function listAttendance_(payload) {
  var sh = sheet_(ATTENDANCE_SHEET);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return { ok: true, data: [] };
  var data = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (!row[1]) continue;
    var rec = {
      timestamp: row[0] instanceof Date ? row[0].toISOString() : String(row[0]),
      employeeName: String(row[1]),
      date: row[2] instanceof Date
        ? Utilities.formatDate(row[2], Session.getScriptTimeZone(), "yyyy-MM-dd")
        : String(row[2]),
      checkIn: row[3] ? String(row[3]) : "",
      checkOut: row[4] ? String(row[4]) : "",
      status: String(row[5] || ""),
      note: row[6] ? String(row[6]) : "",
    };
    if (payload.name && rec.employeeName !== payload.name) continue;
    if (payload.from && rec.date < payload.from) continue;
    if (payload.to && rec.date > payload.to) continue;
    data.push(rec);
  }
  data.sort(function (a, b) {
    if (a.date === b.date) return a.timestamp < b.timestamp ? 1 : -1;
    return a.date < b.date ? 1 : -1;
  });
  return { ok: true, data: data };
}

function verifyPin_(payload) {
  var list = readEmployeesRaw_();
  for (var i = 0; i < list.length; i++) {
    var e = list[i];
    if (e.name === payload.name && e.pin === String(payload.pin) && e.active) {
      return { ok: true, data: { name: e.name, role: e.role } };
    }
  }
  return { ok: false, error: "Tên hoặc mã PIN không đúng" };
}

function findTodayRow_(sh, name, date) {
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var rowDate =
      values[i][2] instanceof Date
        ? Utilities.formatDate(values[i][2], Session.getScriptTimeZone(), "yyyy-MM-dd")
        : String(values[i][2]);
    if (String(values[i][1]) === name && rowDate === date) {
      return i + 1; // 1-based
    }
  }
  return -1;
}

function checkIn_(payload) {
  var name = payload.name;
  var date = today_();
  var sh = sheet_(ATTENDANCE_SHEET);
  var row = findTodayRow_(sh, name, date);
  if (row > 0) {
    var existingIn = sh.getRange(row, 4).getValue();
    if (existingIn) return { ok: false, error: "Bạn đã check-in hôm nay" };
  }
  var time = nowTime_();
  var record = {
    timestamp: new Date().toISOString(),
    employeeName: name,
    date: date,
    checkIn: time,
    checkOut: "",
    status: "checked_in",
    note: payload.note || "",
  };
  if (row > 0) {
    sh.getRange(row, 1, row, 7).setValues([
      [new Date(), name, date, time, "", "checked_in", record.note],
    ]);
  } else {
    sh.appendRow([new Date(), name, date, time, "", "checked_in", record.note]);
  }
  return { ok: true, data: record };
}

function checkOut_(payload) {
  var name = payload.name;
  var date = today_();
  var sh = sheet_(ATTENDANCE_SHEET);
  var row = findTodayRow_(sh, name, date);
  if (row < 0) return { ok: false, error: "Bạn chưa check-in hôm nay" };
  var checkInVal = sh.getRange(row, 4).getValue();
  var checkOutVal = sh.getRange(row, 5).getValue();
  if (!checkInVal) return { ok: false, error: "Bạn chưa check-in hôm nay" };
  if (checkOutVal) return { ok: false, error: "Bạn đã check-out hôm nay" };
  var time = nowTime_();
  sh.getRange(row, 5).setValue(time);
  sh.getRange(row, 6).setValue("checked_out");
  return {
    ok: true,
    data: {
      timestamp: new Date().toISOString(),
      employeeName: name,
      date: date,
      checkIn: String(checkInVal),
      checkOut: time,
      status: "checked_out",
      note: String(sh.getRange(row, 7).getValue() || ""),
    },
  };
}

function addEmployee_(payload) {
  var name = String(payload.name || "").trim();
  var pin = String(payload.pin || "").trim();
  var role = payload.role || "employee";
  var employeeCode = String(payload.employeeCode || "").trim();
  var phone = String(payload.phone || "").trim();
  var cccd = String(payload.cccd || "").trim();
  var address = String(payload.address || "").trim();
  if (!name || !employeeCode || !/^\d{4}$/.test(pin)) {
    return { ok: false, error: "Họ tên, mã NV và PIN 4 số là bắt buộc" };
  }
  var list = readEmployeesRaw_();
  for (var i = 0; i < list.length; i++) {
    if (list[i].name === name) return { ok: false, error: "Họ tên đã tồn tại" };
    if (list[i].employeeCode === employeeCode) {
      return { ok: false, error: "Mã nhân viên đã tồn tại" };
    }
  }
  sheet_(EMPLOYEES_SHEET).appendRow([
    name,
    pin,
    role,
    true,
    employeeCode,
    phone,
    cccd,
    address,
  ]);
  return {
    ok: true,
    data: publicEmp_({
      name: name,
      role: role,
      active: true,
      employeeCode: employeeCode,
      phone: phone,
      cccd: cccd,
      address: address,
    }),
  };
}

function findEmployeeRow_(name) {
  var sh = sheet_(EMPLOYEES_SHEET);
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === name) return i + 1; // 1-based
  }
  return -1;
}

function renameAttendance_(oldName, newName) {
  if (oldName === newName) return;
  var sh = sheet_(ATTENDANCE_SHEET);
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][1]) === oldName) {
      sh.getRange(i + 1, 2).setValue(newName);
    }
  }
}

function updateEmployee_(payload) {
  var originalName = String(payload.originalName || "").trim();
  var name = String(payload.name || "").trim();
  var pinRaw = String(payload.pin != null ? payload.pin : "").trim();
  var role = payload.role || "employee";
  var employeeCode = String(payload.employeeCode || "").trim();
  var phone = String(payload.phone || "").trim();
  var cccd = String(payload.cccd || "").trim();
  var address = String(payload.address || "").trim();
  var active = !(
    payload.active === false ||
    payload.active === "false" ||
    payload.active === 0 ||
    payload.active === "FALSE"
  );

  if (!originalName || !name || !employeeCode) {
    return { ok: false, error: "Họ tên và mã nhân viên là bắt buộc" };
  }
  if (pinRaw && !/^\d{4}$/.test(pinRaw)) {
    return { ok: false, error: "PIN phải gồm 4 chữ số" };
  }

  var row = findEmployeeRow_(originalName);
  if (row < 0) return { ok: false, error: "Không tìm thấy nhân viên" };

  var list = readEmployeesRaw_();
  for (var i = 0; i < list.length; i++) {
    if (list[i].name === originalName) continue;
    if (list[i].name === name) return { ok: false, error: "Họ tên đã tồn tại" };
    if (list[i].employeeCode === employeeCode) {
      return { ok: false, error: "Mã nhân viên đã tồn tại" };
    }
  }

  var sh = sheet_(EMPLOYEES_SHEET);
  var oldPin = String(sh.getRange(row, 2).getValue());
  var pin = pinRaw || oldPin;
  sh.getRange(row, 1, row, 8).setValues([
    [name, pin, role, active, employeeCode, phone, cccd, address],
  ]);
  renameAttendance_(originalName, name);

  return {
    ok: true,
    data: publicEmp_({
      name: name,
      role: role,
      active: active,
      employeeCode: employeeCode,
      phone: phone,
      cccd: cccd,
      address: address,
    }),
  };
}

function deleteEmployee_(payload) {
  var name = String(payload.name || "").trim();
  if (!name) return { ok: false, error: "Thiếu tên nhân viên" };
  var row = findEmployeeRow_(name);
  if (row < 0) return { ok: false, error: "Không tìm thấy nhân viên" };
  sheet_(EMPLOYEES_SHEET).deleteRow(row);
  return { ok: true, data: { name: name } };
}

function deactivateEmployee_(payload) {
  var name = payload.name;
  var list = readEmployeesRaw_();
  for (var i = 0; i < list.length; i++) {
    if (list[i].name === name) {
      var row = findEmployeeRow_(name);
      if (row < 0) break;
      sheet_(EMPLOYEES_SHEET).getRange(row, 4).setValue(false);
      list[i].active = false;
      return { ok: true, data: publicEmp_(list[i]) };
    }
  }
  return { ok: false, error: "Không tìm thấy nhân viên" };
}
