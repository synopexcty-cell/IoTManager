import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI?.trim() || "";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function hasMongoUri(): boolean {
  return Boolean(uri);
}

/**
 * Cache client trên global — bắt buộc với Vercel serverless.
 * family: 4 — tránh treo DNS/IPv6 trên Vercel (lỗi TLS / timeout ~30s).
 */
function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("Thiếu MONGODB_URI");
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 20000,
      // Vercel + Atlas: buộc IPv4
      family: 4,
    });
    global._mongoClientPromise = client.connect().catch((err) => {
      // Cho phép retry lần sau nếu connect fail
      global._mongoClientPromise = undefined;
      throw err;
    });
  }

  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db();
}
