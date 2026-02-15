import jwt from 'jsonwebtoken';

// Mock dependencies before importing the module under test
jest.mock('../../src/services/db', () => ({
  query: jest.fn(),
  getOne: jest.fn(),
}));

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('$argon2id$hashed_password'),
  verify: jest.fn(),
  argon2id: 2,
}));

jest.mock('../../src/config/env', () => ({
  config: {
    jwtSecret: 'test-secret-key-for-jwt-signing',
    jwtExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
  },
}));

import {
  register,
  login,
  refresh as _refresh,
  verifyToken,
  getUserById,
  AuthError,
} from '../../src/services/auth';
import { getOne, query } from '../../src/services/db';
import argon2 from 'argon2';

const mockedGetOne = getOne as jest.MockedFunction<typeof getOne>;
const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedArgon2Verify = argon2.verify as jest.MockedFunction<typeof argon2.verify>;

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      // No existing user
      mockedGetOne.mockResolvedValueOnce(null);
      // Insert returns user
      mockedGetOne.mockResolvedValueOnce({
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Test User',
        avatar_url: null,
        created_at: new Date(),
      });
      // Store refresh token
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await register('test@example.com', 'password123', 'Test User');

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.displayName).toBe('Test User');
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('should throw 409 if email already exists', async () => {
      mockedGetOne.mockResolvedValueOnce({ id: 'existing-user' });

      const err = await register('test@example.com', 'password123', 'Test User').catch(e => e);
      expect(err).toBeInstanceOf(AuthError);
      expect(err.statusCode).toBe(409);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      mockedGetOne.mockResolvedValueOnce({
        id: 'user-123',
        email: 'test@example.com',
        password_hash: '$argon2id$hashed',
        display_name: 'Test User',
        avatar_url: null,
      });
      mockedArgon2Verify.mockResolvedValueOnce(true);
      // Store refresh token
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await login('test@example.com', 'password123');

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('should throw 401 for non-existent email', async () => {
      mockedGetOne.mockResolvedValueOnce(null);

      await expect(login('noone@example.com', 'password123')).rejects.toThrow(AuthError);
      await expect(login('noone@example.com', 'password123')).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('should throw 401 for wrong password', async () => {
      mockedGetOne.mockResolvedValueOnce({
        id: 'user-123',
        email: 'test@example.com',
        password_hash: '$argon2id$hashed',
        display_name: 'Test User',
        avatar_url: null,
      });
      mockedArgon2Verify.mockResolvedValueOnce(false);

      await expect(login('test@example.com', 'wrongpassword')).rejects.toThrow(AuthError);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid JWT token', () => {
      const token = jwt.sign(
        { sub: 'user-123', email: 'test@example.com', type: 'access' },
        'test-secret-key-for-jwt-signing',
      );
      const payload = verifyToken(token);
      expect(payload.sub).toBe('user-123');
      expect(payload.email).toBe('test@example.com');
      expect(payload.type).toBe('access');
    });

    it('should throw for an invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });

    it('should throw for an expired token', () => {
      const token = jwt.sign(
        { sub: 'user-123', email: 'test@example.com', type: 'access' },
        'test-secret-key-for-jwt-signing',
        { expiresIn: -10 },
      );
      expect(() => verifyToken(token)).toThrow();
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      mockedGetOne.mockResolvedValueOnce({
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Test User',
        avatar_url: null,
        created_at: new Date('2024-01-01'),
      });

      const user = await getUserById('user-123');
      expect(user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
        createdAt: expect.any(Date),
      });
    });

    it('should return null when user not found', async () => {
      mockedGetOne.mockResolvedValueOnce(null);
      const user = await getUserById('non-existent');
      expect(user).toBeNull();
    });
  });

  describe('AuthError', () => {
    it('should have correct properties', () => {
      const err = new AuthError('Test error', 401);
      expect(err.message).toBe('Test error');
      expect(err.statusCode).toBe(401);
      expect(err.name).toBe('AuthError');
      expect(err).toBeInstanceOf(Error);
    });
  });
});
