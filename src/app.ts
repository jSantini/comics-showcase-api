import Fastify, { type FastifyServerOptions } from 'fastify';
import { fileURLToPath } from 'node:url';
import { comicsRoutes } from './modules/comics/comics.routes.js';
import { createCatalog } from './modules/comics/comics.service.js';
import { defaultCoversDirectory, loadCovers, registerCoverRoutes } from './modules/covers/covers.js';
import { validatePublicBaseUrl } from './config/env.js';
import { registerErrors } from './shared/errors.js';

interface AppConfig {
  publicBaseUrl?: string | undefined;
  coversDirectory?: string;
}

export function buildApp(options: FastifyServerOptions = {}, config: AppConfig = {}) {
  const publicBaseUrl = validatePublicBaseUrl(config.publicBaseUrl);
  const assets = loadCovers(config.coversDirectory ?? fileURLToPath(defaultCoversDirectory));
  const catalog = createCatalog(assets, publicBaseUrl);
  const app = Fastify({ logger: false, requestTimeout: 15000, ...options });
  registerErrors(app);
  app.get('/health', { schema: { response: { 200: {
    type: 'object', additionalProperties: false, required: ['status'],
    properties: { status: { type: 'string', const: 'ok' } },
  } } } }, () => ({ status: 'ok' }));
  registerCoverRoutes(app, assets);
  app.register(comicsRoutes, { prefix: '/api', catalog });
  return app;
}
