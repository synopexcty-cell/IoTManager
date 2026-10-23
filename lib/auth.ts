import type { AuthUser } from "./types";

const AUTH_KEY = "chamcong_user";
const TOKEN_KEY = "chamcong_token";
const PENDING_PIN_KEY = "chamcong_pending_pin";

export function setPendingPin(pin: string): void {
  try {
    sessionStorage.setItem(PENDING_PIN_KEY, pin);
  } catch {
    /* ignore */
  }
}

export function getPendingPin(): string {
  try {
    return sessionStorage.getItem(PENDING_PIN_KEY) || "";
  } catch {
    return "";
  }
}

export function clearPendingPin(): void {
  try {
    sessionStorage.removeItem(PENDING_PIN_KEY);
  } catch {
    /* ignore */
  }
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function getStoredToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
