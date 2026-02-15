import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as authService from '../services/auth.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(50),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export const authRoutes: FastifyPluginAsync = async app => {
  app.post('/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation failed', details: body.error.flatten() });
    }

    try {
      const result = await authService.register(
        body.data.email,
        body.data.password,
        body.data.displayName,
      );
      return reply.status(201).send(result);
    } catch (err) {
      if (err instanceof authService.AuthError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      app.log.error(err, 'Registration failed');
      return reply.status(500).send({ error: 'Registration failed' });
    }
  });

  app.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation failed', details: body.error.flatten() });
    }

    try {
      const result = await authService.login(body.data.email, body.data.password);
      return reply.send(result);
    } catch (err) {
      if (err instanceof authService.AuthError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      app.log.error(err, 'Login failed');
      return reply.status(500).send({ error: 'Login failed' });
    }
  });

  app.post('/refresh', async (request, reply) => {
    const body = refreshSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'refreshToken is required' });
    }

    try {
      const result = await authService.refresh(body.data.refreshToken);
      return reply.send(result);
    } catch (err) {
      if (err instanceof authService.AuthError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      app.log.error(err, 'Token refresh failed');
      return reply.status(500).send({ error: 'Token refresh failed' });
    }
  });
};
