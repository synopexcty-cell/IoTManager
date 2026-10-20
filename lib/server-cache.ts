/** In-memory TTL cache (warm serverless instance). */

type Entry = { value: unknown; expires: number };

declare global {
  // eslint-disable-next-line no-var
  var _appServerCache: Map<string, Entry> | undefined;
}

function store(): Map<string, Entry> {
  if (!global._appServerCache) {
    global._appServerCache = new Map();
  }
  return global._appServerCache;
}

export function cacheGet<T>(key: string): T | undefined {
  const hit = store().get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expires) {
    store().delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function cacheSet(key: string, value: unknown, ttlMs: number): void {
  store().set(key, { value, expires: Date.now() + ttlMs });
}

export function cacheInvalidate(prefix?: string): void {
  if (!prefix) {
    store().clear();
    return;
  }
  Array.from(store().keys()).forEach((key) => {
    if (key.startsWith(prefix)) store().delete(key);
  });
}
