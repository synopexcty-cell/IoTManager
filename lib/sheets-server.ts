import { mongoHandler } from "./mongo-store";
import { hasMongoUri } from "./mongodb";
import type { Session } from "./session";
import type { SheetsRequest, SheetsResponse } from "./types";

export function getDataConfig() {
  const configured = hasMongoUri();
  return {
    backend: configured ? ("mongo" as const) : ("unconfigured" as const),
    configured,
  };
}

export async function callSheetsServer<T = unknown>(
  request: SheetsRequest,
  actor: Session | null
): Promise<SheetsResponse<T>> {
  if (!hasMongoUri()) {
    return {
      ok: false,
      error: "Chưa sẵn sàng",
    };
  }
  return mongoHandler<T>(request, actor);
}
