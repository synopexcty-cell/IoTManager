import { readFileSync } from "fs";
import { MongoClient } from "mongodb";
import { resolve } from "path";

function loadLocalUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI.trim();
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    const line = raw.split("\n").find((l) => l.startsWith("MONGODB_URI="));
    if (!line) return "";
    return line.replace(/^MONGODB_URI=/, "").trim().replace(/^["']|["']$/g, "");
  } catch {
    return "";
  }
}

const uri = loadLocalUri();
if (!uri) {
  console.error("Thiếu MONGODB_URI (.env.local hoặc env)");
  process.exit(1);
}

const client = new MongoClient(uri, {
  family: 4,
  serverSelectionTimeoutMS: 15000,
});

const doc = {
  name: "Admin",
  pin: "999999",
  role: "admin",
  active: true,
  employeeCode: "NV001",
  phone: "",
  cccd: "",
  address: "",
};

await client.connect();
const col = client.db().collection("employees");
const r = await col.updateOne({ name: "Admin" }, { $set: doc }, { upsert: true });
console.log({
  matched: r.matchedCount,
  modified: r.modifiedCount,
  upserted: r.upsertedCount,
});
const saved = await col.findOne(
  { name: "Admin" },
  { projection: { name: 1, role: 1, employeeCode: 1, active: 1 } }
);
console.log("OK Admin:", saved);
await client.close();
