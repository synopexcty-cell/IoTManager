import { mockHandler } from "./sheets-mock";
import type { SheetsRequest, SheetsResponse } from "./types";

export function getSheetsConfig() {
  const url = process.env.SHEETS_WEBAPP_URL?.trim() || "";
  const secret = process.env.SHEETS_API_SECRET?.trim() || "";
  return {
    url,
    secret,
    mock: !url,
  };
}

/** Server-side call to Apps Script (or mock). Attaches API secret. */
export async function callSheetsServer<T = unknown>(
  request: SheetsRequest
): Promise<SheetsResponse<T>> {
  const { url, secret, mock } = getSheetsConfig();

  if (mock) {
    return mockHandler<T>(request);
  }

  if (!secret) {
    return {
      ok: false,
      error: "Thiếu SHEETS_API_SECRET trên server",
    };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...request, secret }),
      redirect: "follow",
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as SheetsResponse<T>;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Lỗi kết nối Sheets",
    };
  }
}
