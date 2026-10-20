import { MongoClient, Db } from "mongodb";

/** Bỏ dấu " ' và khoảng trắng — hay dính khi copy từ Atlas/Vercel */
function normalizeUri(raw: string): string {
  return raw.trim().replace(/^["']+|["']+$/g, "");
}

const uri = normalizeUri(process.env.MONGODB_URI || "");

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function hasMongoUri(): boolean {
  return Boolean(uri);
}

/**
 * Cache client trên global — bắt buộc với Vercel serverless.
 * family: 4 + autoSelectFamily: false — tránh TLS/IPv6 lỗi trên Vercel.
 */
function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("Thiếu MONGODB_URI");
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 20000,
      family: 4,
      // Node 20+/Vercel: tránh auto IPv6 gây tlsv1 alert internal error
      autoSelectFamily: false,
    } as ConstructorParameters<typeof MongoClient>[1]);
    global._mongoClientPromise = client.connect().catch((err) => {
      global._mongoClientPromise = undefined;
      throw err;
    });
  }

  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  // Ưu tiên DB trong URI path; fallback tên app
  return client.db();
}

/** URI đã chuẩn hóa (che password) — debug */
export function getMongoHostHint(): string {
  if (!uri) return "(empty)";
  try {
    const u = new URL(uri.replace("mongodb+srv://", "https://").replace("mongodb://", "https://"));
    return `${u.hostname}${u.pathname || "/"}`;
  } catch {
    return "(invalid uri)";
  }
}
