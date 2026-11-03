import Fastify, { type FastifyServerOptions } from 'fastify';
import { comicsRoutes } from './modules/comics/comics.routes.js';
import { registerErrors } from './shared/errors.js';

export function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify({ logger: false, requestTimeout: 15000, ...options });
  registerErrors(app);
  app.get('/health', { schema: { response: { 200: {
    type: 'object', additionalProperties: false, required: ['status'],
    properties: { status: { type: 'string', const: 'ok' } },
  } } } }, () => ({ status: 'ok' }));
  app.register(comicsRoutes, { prefix: '/api' });
  return app;
}
