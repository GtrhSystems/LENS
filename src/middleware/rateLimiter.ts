import { RateLimiterRedis } from 'rate-limiter-flexible';
import { RedisService } from '../services/RedisService';
import { Request, Response, NextFunction } from 'express';

const redisService = new RedisService();

const rateLimiter = new RateLimiterRedis({
  storeClient: redisService.getClient(),
  keyPrefix: 'middleware',
  points: 100,
  duration: 60,
});

export const rateLimiterMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({ error: 'Too Many Requests' });
  }
};

export { rateLimiter };