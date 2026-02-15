import argon2 from 'argon2';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { query, getOne } from './db.js';

// Workaround: @fastify/jwt is registered on the app instance,
// but we also need standalone JWT for service-layer token ops.
// Using jsonwebtoken directly for sign/verify.

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  provider: string;
  created_at: Date;
}

interface TokenPayload {
  sub: string; // user id
  email: string;
  type: 'access' | 'refresh';
}

// ─── Password hashing ──────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64MB
    timeCost: 3,
    parallelism: 4,
  });
}

async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

// ─── Token management ───────────────────────────────────────

// Convert duration strings like "15m" or "7d" to seconds
function parseDuration(dur: string): number {
  const match = dur.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // default 15min
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 900;
  }
}

function signAccessToken(userId: string, email: string): string {
  const payload: TokenPayload = { sub: userId, email, type: 'access' };
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: parseDuration(config.jwtExpiresIn),
  });
}

function signRefreshToken(userId: string, email: string): string {
  const payload: TokenPayload = { sub: userId, email, type: 'refresh' };
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: parseDuration(config.jwtRefreshExpiresIn),
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
}

async function storeRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt],
  );
}

async function revokeRefreshToken(tokenHash: string): Promise<void> {
  await query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL',
    [tokenHash],
  );
}

async function isRefreshTokenValid(token: string): Promise<boolean> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const row = await getOne(
    'SELECT id FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()',
    [tokenHash],
  );
  return row !== null;
}

// ─── Public API ─────────────────────────────────────────────

export async function register(email: string, password: string, displayName: string) {
  // Check if user exists
  const existing = await getOne<UserRow>('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) {
    throw new AuthError('Email already registered', 409);
  }

  const passwordHash = await hashPassword(password);

  const user = await getOne<UserRow>(
    `INSERT INTO users (email, password_hash, display_name, provider)
     VALUES ($1, $2, $3, 'email')
     RETURNING id, email, display_name, avatar_url, created_at`,
    [email, passwordHash, displayName],
  );

  if (!user) throw new AuthError('Failed to create user', 500);

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id, user.email);

  // Store refresh token (expires in 7 days)
  const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await storeRefreshToken(user.id, refreshToken, refreshExpiry);

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
    },
    accessToken,
    refreshToken,
  };
}

export async function login(email: string, password: string) {
  const user = await getOne<UserRow>(
    'SELECT id, email, password_hash, display_name, avatar_url FROM users WHERE email = $1',
    [email],
  );

  if (!user) {
    throw new AuthError('Invalid email or password', 401);
  }

  const valid = await verifyPassword(user.password_hash, password);
  if (!valid) {
    throw new AuthError('Invalid email or password', 401);
  }

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id, user.email);

  const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await storeRefreshToken(user.id, refreshToken, refreshExpiry);

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
    },
    accessToken,
    refreshToken,
  };
}

export async function refresh(refreshTokenStr: string) {
  // Verify JWT signature
  let payload: TokenPayload;
  try {
    payload = verifyToken(refreshTokenStr);
  } catch {
    throw new AuthError('Invalid refresh token', 401);
  }

  if (payload.type !== 'refresh') {
    throw new AuthError('Invalid token type', 401);
  }

  // Check token is not revoked
  const valid = await isRefreshTokenValid(refreshTokenStr);
  if (!valid) {
    throw new AuthError('Refresh token revoked or expired', 401);
  }

  // Rotate: revoke old, issue new
  const oldHash = crypto.createHash('sha256').update(refreshTokenStr).digest('hex');
  await revokeRefreshToken(oldHash);

  const user = await getOne<UserRow>('SELECT id, email, display_name FROM users WHERE id = $1', [payload.sub]);
  if (!user) {
    throw new AuthError('User not found', 401);
  }

  const newAccessToken = signAccessToken(user.id, user.email);
  const newRefreshToken = signRefreshToken(user.id, user.email);

  const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await storeRefreshToken(user.id, newRefreshToken, refreshExpiry);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function getUserById(userId: string) {
  const user = await getOne<UserRow>(
    'SELECT id, email, display_name, avatar_url, created_at FROM users WHERE id = $1',
    [userId],
  );
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
  };
}

// ─── Auth Error ─────────────────────────────────────────────

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}
