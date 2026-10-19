import type { QueuedRequest, SheetsRequest } from "./types";

const QUEUE_KEY = "chamcong_offline_queue";

export function getQueue(): QueuedRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedRequest[];
  } catch {
    return [];
  }
}

export function enqueue(request: SheetsRequest): QueuedRequest {
  const item: QueuedRequest = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    request,
    createdAt: new Date().toISOString(),
  };
  const queue = getQueue();
  queue.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return item;
}

export function setQueue(queue: QueuedRequest[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}
