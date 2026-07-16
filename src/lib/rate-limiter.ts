const requestLog = new Map<string, number[]>();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 60;

export function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const timestamps = requestLog.get(key) ?? [];
  const recent = timestamps.filter((t) => t > windowStart);
  recent.push(now);
  requestLog.set(key, recent);

  if (requestLog.size > 10000) {
    const cutoff = now - WINDOW_MS * 2;
    for (const [k, ts] of requestLog) {
      requestLog.set(k, ts.filter((t) => t > cutoff));
    }
  }

  const allowed = recent.length + 1 <= MAX_REQUESTS;
  return { allowed, remaining: Math.max(0, MAX_REQUESTS - recent.length) };
}
