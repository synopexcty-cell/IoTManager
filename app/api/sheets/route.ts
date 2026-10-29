import { getDb, hasMongoUri } from "@/lib/mongodb";
import { isViewOnly } from "@/lib/roles";
import { bearerToken, verifySession } from "@/lib/session";
import { getDataConfig, callSheetsServer } from "@/lib/sheets-server";
import type { SheetsAction, SheetsRequest } from "@/lib/types";
import { NextResponse } from "next/server";

const PUBLIC_ACTIONS: SheetsAction[] = ["verifyPin", "listLoginRoster"];
const ADMIN_ACTIONS: SheetsAction[] = [
  "addEmployee",
  "importEmployees",
  "updateEmployee",
  "deleteEmployee",
  "deactivateEmployee",
  "updateSettings",
];
const WRITE_ACTIONS: SheetsAction[] = [
  "checkIn",
  "checkOut",
  "saveAttendance",
  "saveOt",
  "saveMeal",
  ...ADMIN_ACTIONS,
];

const ALLOWED: SheetsAction[] = [
  "listEmployees",
  "listAttendance",
  "verifyPin",
  "listLoginRoster",
  "checkIn",
  "checkOut",
  "saveAttendance",
  "listOt",
  "saveOt",
  "listMeals",
  "saveMeal",
  "addEmployee",
  "importEmployees",
  "updateEmployee",
  "deleteEmployee",
  "deactivateEmployee",
  "changePassword",
  "getSettings",
  "updateSettings",
];

/** Trạng thái + warm Mongo connection */
export async function GET() {
  const { configured } = getDataConfig();
  if (!configured || !hasMongoUri()) {
    return NextResponse.json(
      { ok: false, error: "Chưa sẵn sàng" },
      { status: 503 }
    );
  }
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Không kết nối được máy chủ" },
      { status: 503 }
    );
  }
}

export async function POST(req: Request) {
  const { configured } = getDataConfig();
  if (!configured) {
    return NextResponse.json(
      { ok: false, error: "Chưa sẵn sàng" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const action = (body as SheetsRequest)?.action;
  if (!action || !ALLOWED.includes(action)) {
    return NextResponse.json(
      { ok: false, error: "Invalid action" },
      { status: 400 }
    );
  }

  const request: SheetsRequest = {
    action,
    payload: (body as SheetsRequest).payload,
  };

  const actor = verifySession(bearerToken(req));
  if (!PUBLIC_ACTIONS.includes(action) && !actor) {
    return NextResponse.json(
      { ok: false, error: "Cần đăng nhập" },
      { status: 401 }
    );
  }
  if (ADMIN_ACTIONS.includes(action) && actor?.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Không có quyền" },
      { status: 403 }
    );
  }
  if (WRITE_ACTIONS.includes(action) && isViewOnly(actor?.role)) {
    return NextResponse.json(
      { ok: false, error: "Tài khoản chỉ xem — không được sửa" },
      { status: 403 }
    );
  }

  const result = await callSheetsServer(request, actor);
  return NextResponse.json(result);
}
