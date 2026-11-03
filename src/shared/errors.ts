import type { FastifyInstance } from 'fastify';

export const errorSchema = {
  type: 'object', additionalProperties: false, required: ['error'],
  properties: { error: {
    type: 'object', additionalProperties: false, required: ['code', 'message'],
    properties: { code: { type: 'string' }, message: { type: 'string' } },
  } },
} as const;

export function registerErrors(app: FastifyInstance) {
  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof Error && (('validation' in error && error.validation) || ('statusCode' in error && error.statusCode === 400))) {
      return reply.code(400).send({ error: { code: 'INVALID_REQUEST', message: 'Invalid request parameters' } });
    }
    // Avoid logging request headers, query strings, bodies or arbitrary error messages.
    request.log.error({ code: 'INTERNAL_ERROR' }, 'Request failed');
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  });
}
