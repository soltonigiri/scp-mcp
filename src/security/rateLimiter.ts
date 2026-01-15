export type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

type Counter = { windowStartMs: number; count: number };

export class FixedWindowRateLimiter {
  private readonly config: RateLimitConfig;
  private readonly counters = new Map<string, Counter>();

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  consume(key: string): { allowed: boolean; remaining: number; resetAtMs: number } {
    const now = Date.now();
    const existing = this.counters.get(key);

    if (!existing || now - existing.windowStartMs >= this.config.windowMs) {
      const fresh: Counter = { windowStartMs: now, count: 1 };
      this.counters.set(key, fresh);
      return {
        allowed: true,
        remaining: Math.max(0, this.config.maxRequests - fresh.count),
        resetAtMs: fresh.windowStartMs + this.config.windowMs,
      };
    }

    if (existing.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAtMs: existing.windowStartMs + this.config.windowMs,
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: Math.max(0, this.config.maxRequests - existing.count),
      resetAtMs: existing.windowStartMs + this.config.windowMs,
    };
  }
}

