// src/lib/rate-limit.ts
// In-memory rate limiter — suitable for single-instance deployments.
// For multi-instance (e.g. Vercel serverless), migrate to Upstash Redis.

interface RateLimitEntry {
  count: number;
  resetAt: number; // epoch ms
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes to prevent memory leak
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  store.forEach((entry, key) => {
    if (now > entry.resetAt) store.delete(key);
  });
}

interface RateLimitConfig {
  /** Unique namespace (e.g. "otp-send", "otp-verify") */
  prefix: string;
  /** Maximum attempts within the window */
  maxAttempts: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Check and consume a rate limit token.
 * @param identifier - The key to rate limit (e.g. email, IP)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const key = `${config.prefix}:${identifier}`;
  const now = Date.now();
  const entry = store.get(key);

  // No entry or window expired → reset
  if (!entry || now > entry.resetAt) {
    store.set(key, {
      count: 1,
      resetAt: now + config.windowSeconds * 1000,
    });
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      retryAfterSeconds: 0,
    };
  }

  // Within window
  if (entry.count < config.maxAttempts) {
    entry.count++;
    return {
      allowed: true,
      remaining: config.maxAttempts - entry.count,
      retryAfterSeconds: 0,
    };
  }

  // Limit exceeded
  const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds,
  };
}

// --- Pre-configured limiters for auth flows ---

/** Max 3 OTP sends per email per 15 minutes */
export function checkOtpSendLimit(email: string): RateLimitResult {
  return checkRateLimit(email.toLowerCase().trim(), {
    prefix: "otp-send",
    maxAttempts: 3,
    windowSeconds: 15 * 60,
  });
}

/** Max 5 OTP verification attempts per email per 10 minutes */
export function checkOtpVerifyLimit(email: string): RateLimitResult {
  return checkRateLimit(email.toLowerCase().trim(), {
    prefix: "otp-verify",
    maxAttempts: 5,
    windowSeconds: 10 * 60,
  });
}

/** Max 10 requests per IP per minute (general API protection) */
export function checkIpLimit(ip: string): RateLimitResult {
  return checkRateLimit(ip, {
    prefix: "ip-general",
    maxAttempts: 10,
    windowSeconds: 60,
  });
}
