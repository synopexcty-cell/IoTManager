import { createHmac, timingSafeEqual } from "crypto";
import { isKnownRole } from "./roles";
import type { Role } from "./types";

export type Session = {
  employeeCode: string;
  role: Role;
  name: string;
};

type Payload = Session & { exp: number };

const TTL_SEC = 60 * 60 * 24 * 14;

function secret(): string {
  return process.env.AUTH_SECRET || process.env.MONGODB_URI || "";
}

export function signSession(session: Session): string {
  const payload: Payload = {
    ...session,
    exp: Math.floor(Date.now() / 1000) + TTL_SEC,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySession(token: string | undefined | null): Session | null {
  if (!token || !secret()) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as Payload;
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    if (!data.employeeCode || !data.name || !isKnownRole(data.role)) {
      return null;
    }
    return {
      employeeCode: data.employeeCode,
      role: data.role,
      name: data.name,
    };
  } catch {
    return null;
  }
}

export function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || "";
  if (/^bearer\s+/i.test(h)) return h.replace(/^bearer\s+/i, "").trim();
  return null;
}
