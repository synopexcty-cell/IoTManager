import { mongoHandler } from "./mongo-store";
import { hasMongoUri } from "./mongodb";
import { mockHandler } from "./sheets-mock";
import type { SheetsRequest, SheetsResponse } from "./types";

export type DataBackend = "mongo" | "mock";

export function getDataConfig() {
  const backend: DataBackend = hasMongoUri() ? "mongo" : "mock";
  return {
    backend,
    mock: backend === "mock",
  };
}

/** @deprecated dùng getDataConfig */
export function getSheetsConfig() {
  const c = getDataConfig();
  return { mock: c.mock, url: "", secret: "" };
}

/** MongoDB Atlas, hoặc mock khi thiếu MONGODB_URI */
export async function callSheetsServer<T = unknown>(
  request: SheetsRequest
): Promise<SheetsResponse<T>> {
  if (hasMongoUri()) {
    return mongoHandler<T>(request);
  }
  return mockHandler<T>(request);
}
