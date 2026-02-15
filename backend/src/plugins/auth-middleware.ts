import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { verifyToken } from '../services/auth.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userEmail?: string;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('userId', undefined);
  app.decorateRequest('userEmail', undefined);

  app.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.slice(7);
    try {
      const payload = verifyToken(token);
      if (payload.type !== 'access') {
        return reply.status(401).send({ error: 'Invalid token type' });
      }
      request.userId = payload.sub;
      request.userEmail = payload.email;
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }
  });
};

// Wrap with fastify-plugin to break encapsulation — makes
// `app.authenticate` available to all sibling route plugins
export const authMiddleware = fp(authPlugin, {
  name: 'auth-middleware',
});
