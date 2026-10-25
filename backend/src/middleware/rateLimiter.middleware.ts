import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from '../services/cache.service';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator: (req: any) => string;
}

export function createRateLimiter(options: RateLimiterOptions) {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(...args),
      prefix: 'rl:'
    }),
    windowMs: options.windowMs,
    max: options.max,
    message: options.message,
    keyGenerator: options.keyGenerator,
    standardHeaders: true,
    legacyHeaders: false
  });
}