import { MongoClient, type Db, type MongoClientOptions } from "mongodb";

function normalizeUri(raw: string): string {
  let uri = raw.trim().replace(/^["']+|["']+$/g, "");
  if (!uri) return "";

  // URI Atlas onboarding hay thiếu /chamcong?...
  if (/mongodb(\+srv)?:\/\//i.test(uri) && !/mongodb(\+srv)?:\/\/[^/]+\/.+/.test(uri)) {
    uri = `${uri.replace(/\/+$/, "")}/chamcong?retryWrites=true&w=majority`;
  }
  return uri;
}

const uri = normalizeUri(process.env.MONGODB_URI || "");

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function hasMongoUri(): boolean {
  return Boolean(uri);
}

export function friendlyMongoError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes("SSL alert number 80") ||
    msg.includes("tlsv1 alert internal error") ||
    msg.includes("ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR")
  ) {
    return "Atlas đang chặn IP của Vercel. Vào MongoDB Atlas → Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0), rồi đợi ~1 phút.";
  }
  if (msg.includes("authentication failed") || msg.includes("bad auth")) {
    return "Sai user/password MongoDB. Kiểm tra MONGODB_URI trên Vercel.";
  }
  if (msg.includes("ENOTFOUND") || msg.includes("querySrv")) {
    return "Không resolve được cluster Atlas. Kiểm tra hostname trong MONGODB_URI.";
  }
  return msg || "Lỗi MongoDB";
}

const options: MongoClientOptions = {
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 12000,
  connectTimeoutMS: 12000,
  socketTimeoutMS: 20000,
  tls: true,
  // Node dual-stack (IPv6 trước) hay khiến Atlas abort TLS
  autoSelectFamily: false,
};

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("Thiếu MONGODB_URI");
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect().catch((err) => {
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

export function getMongoHostHint(): string {
  if (!uri) return "(empty)";
  try {
    const u = new URL(
      uri.replace("mongodb+srv://", "https://").replace("mongodb://", "https://")
    );
    return `${u.hostname}${u.pathname || "/"}`;
  } catch {
    return "(invalid uri)";
  }
}
