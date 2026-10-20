import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI?.trim() || "";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("Thiếu MONGODB_URI");
  }
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }
  const client = new MongoClient(uri);
  return client.connect();
}

export function hasMongoUri(): boolean {
  return Boolean(uri);
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(); // dùng DB trong URI path (/chamcong)
}
