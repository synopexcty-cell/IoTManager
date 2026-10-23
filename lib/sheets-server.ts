import { mongoHandler } from "./mongo-store";
import { hasMongoUri } from "./mongodb";
import type { SheetsRequest, SheetsResponse } from "./types";

export function getDataConfig() {
  const configured = hasMongoUri();
  return {
    backend: configured ? ("mongo" as const) : ("unconfigured" as const),
    configured,
  };
}

/** Chỉ MongoDB Atlas — thiếu MONGODB_URI thì báo lỗi, không fallback demo */
export async function callSheetsServer<T = unknown>(
  request: SheetsRequest
): Promise<SheetsResponse<T>> {
  if (!hasMongoUri()) {
    return {
      ok: false,
      error: "Chưa sẵn sàng",
    };
  }
  return mongoHandler<T>(request);
}
