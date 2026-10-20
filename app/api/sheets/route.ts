import { getDataConfig, callSheetsServer } from "@/lib/sheets-server";
import type { SheetsAction, SheetsRequest } from "@/lib/types";
import { NextResponse } from "next/server";

const ALLOWED: SheetsAction[] = [
  "listEmployees",
  "listAttendance",
  "verifyPin",
  "checkIn",
  "checkOut",
  "addEmployee",
  "updateEmployee",
  "deleteEmployee",
  "deactivateEmployee",
];

/** Trạng thái kết nối MongoDB */
export async function GET() {
  const { configured, backend } = getDataConfig();
  if (!configured) {
    return NextResponse.json(
      {
        ok: false,
        backend,
        error: "Chưa cấu hình MONGODB_URI",
      },
      { status: 503 }
    );
  }
  return NextResponse.json({ ok: true, backend: "mongo" });
}

export async function POST(req: Request) {
  const { configured } = getDataConfig();
  if (!configured) {
    return NextResponse.json(
      { ok: false, error: "Chưa cấu hình MONGODB_URI trên server" },
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
