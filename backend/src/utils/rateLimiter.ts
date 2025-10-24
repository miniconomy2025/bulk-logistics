import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";

interface RateLimiterParams {
    message?: string;
    windowMs?: number;
    max?: number;
}

export function rateLimiter(params: RateLimiterParams = {}): RateLimitRequestHandler {
    return rateLimit({
        max: params.max ?? 100,
        message: {
            error: params.message ?? "Too many requests. Please try again later.",
        },
    });
}
//
