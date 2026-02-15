import Fastify from 'fastify';
import { authRoutes } from '../../src/routes/auth';

jest.mock('../../src/config/env', () => ({
  config: {
    jwtSecret: 'test-secret-key-for-jwt-signing',
    jwtExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
  },
}));

jest.mock('../../src/services/db', () => ({
  query: jest.fn(),
  getOne: jest.fn(),
}));

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('$argon2id$hashed'),
  verify: jest.fn().mockResolvedValue(true),
  argon2id: 2,
}));

describe('Auth Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(authRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /register', () => {
    it('should return 400 for invalid email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/register',
        payload: { email: 'not-an-email', password: 'password123', displayName: 'Test' },
      });

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('Validation failed');
    });

    it('should return 400 for short password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/register',
        payload: { email: 'test@example.com', password: 'short', displayName: 'Test' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for missing displayName', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/register',
        payload: { email: 'test@example.com', password: 'password123' },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /login', () => {
    it('should return 400 for invalid email format', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/login',
        payload: { email: 'bad-email', password: 'password123' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for missing password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/login',
        payload: { email: 'test@example.com' },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /refresh', () => {
    it('should return 400 for missing refreshToken', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/refresh',
        payload: {},
      });

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('refreshToken is required');
    });
  });
});
