import rateLimit from 'express-rate-limit';

export const GENERIC_LOGIN_FAILURE = 'Incorrect username or password.';

/**
 * 5 login attempts per 15 minutes per IP. The response body reuses the exact
 * generic failure string so a blocked attacker cannot distinguish "wrong
 * password" from "rate limited" either.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: GENERIC_LOGIN_FAILURE, code: 'rate_limited' },
});

/** A far looser ceiling for the rest of the API, to blunt scripted abuse. */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.', code: 'rate_limited' },
});
