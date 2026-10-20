import { mongoHandler } from "./mongo-store";
import { hasMongoUri } from "./mongodb";
import { mockHandler } from "./sheets-mock";
import type { SheetsRequest, SheetsResponse } from "./types";

export type DataBackend = "mongo" | "sheets" | "mock";

export function getDataConfig() {
  const mongo = hasMongoUri();
  const url = process.env.SHEETS_WEBAPP_URL?.trim() || "";
  const secret = process.env.SHEETS_API_SECRET?.trim() || "";

  let backend: DataBackend = "mock";
  if (mongo) backend = "mongo";
  else if (url) backend = "sheets";

  return {
    backend,
    mock: backend === "mock",
    url,
    secret,
  };
}

/** @deprecated dùng getDataConfig */
export function getSheetsConfig() {
  const c = getDataConfig();
  return { url: c.url, secret: c.secret, mock: c.mock };
}

/** Ưu tiên: MongoDB → Google Sheets → mock */
export async function callSheetsServer<T = unknown>(
  request: SheetsRequest
): Promise<SheetsResponse<T>> {
  const { backend, url, secret } = getDataConfig();

  if (backend === "mongo") {
    return mongoHandler<T>(request);
  }

  if (backend === "mock") {
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
