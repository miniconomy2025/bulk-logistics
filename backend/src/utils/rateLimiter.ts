import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";

interface RateLimiterParams {
    message?: string;
    windowMs?: number;
    max?: number;
}

export function rateLimiter(params: RateLimiterParams = {}): RateLimitRequestHandler {
    return rateLimit({
        windowMs: params.windowMs ?? 15 * 60 * 1000,
        max: params.max ?? 10,
        message: {
            error: params.message ?? "Too many requests. Please try again later.",
        },
    });
}
