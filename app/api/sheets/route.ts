import { getDb, hasMongoUri } from "@/lib/mongodb";
import { getDataConfig, callSheetsServer } from "@/lib/sheets-server";
import type { SheetsAction, SheetsRequest } from "@/lib/types";
import { NextResponse } from "next/server";

const ALLOWED: SheetsAction[] = [
  "listEmployees",
  "listAttendance",
  "verifyPin",
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

  const result = await callSheetsServer(request);
  return NextResponse.json(result);
}
