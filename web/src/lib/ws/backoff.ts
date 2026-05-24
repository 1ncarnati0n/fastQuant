export interface BackoffOptions {
  baseMs?: number;
  maxMs?: number;
  jitter?: boolean;
}

export function nextDelay(attempt: number, opts: BackoffOptions = {}): number {
  const { baseMs = 1_000, maxMs = 30_000, jitter = true } = opts;
  const exp = Math.min(baseMs * 2 ** attempt, maxMs);
  return jitter ? exp * (0.5 + Math.random() * 0.5) : exp;
}
