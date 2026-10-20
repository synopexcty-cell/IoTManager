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

/** Status — không lộ URL / secret */
export async function GET() {
  const { mock, backend } = getDataConfig();
  return NextResponse.json({ ok: true, mock, backend });
}

export async function POST(req: Request) {
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
