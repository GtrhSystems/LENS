import { RateLimiterRedis } from 'rate-limiter-flexible';
import { RedisService } from '../services/RedisService';
import { Request, Response, NextFunction } from 'express';

const redisService = new RedisService();

const rateLimiter = new RateLimiterRedis({
  storeClient: redisService.client,
  keyPrefix: 'rl',
  points: config.performance.rateLimitMax,
  duration: Math.floor(config.performance.rateLimitWindowMs / 1000)
});

export const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    await rateLimiter.consume(clientIp);
    next();
  } catch (rejRes) {
    res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000) || 1
    });
  }
};

export { rateLimiter };